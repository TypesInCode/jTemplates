# Next steps: DiffTree / JSON diff rework

Branch `diff-tree-route-enhancements`, on top of `2985d8f`. Everything below is **uncommitted**
in the working tree, as of 2026-11-09.

**State:** `npx tsc --noEmit -p .` is clean, and `npx vitest run` passes (574 tests).

## Why

builder-app (`~/Development/Withum/digital/procedures-engine/builder-app`, branch
`feature/result-index-worker`) runs a 92 MB project through `StoreAsync` + DiffTree, and it's slow.
Its keyFunc (`entityKey`) makes every object with a `key` a root: entities, every row (`o_…`), and
every PropDef (`p_…`). Its `storeWrite` JSON-copies every value, so everything the DiffTree
receives is new, and object reuse depends entirely on the diff. Its projections rely on that reuse
to skip work.

## Done (in the working tree)

### `src/Utils/json.ts`
- **Diff records:** `write`, `delete` (removes the last property of its path) and `splice` (one
  record per array: `splices: [{ index, delete, insert }]`, where an insert item is
  `MOVE { from }` (an old index) or `INSERT { value }`). `move` records are gone.
- **`JsonDiff(new, old, rootPath?, strategy?)`:** arrays are diffed by position (master's
  algorithm, keeping the prefix and suffix skips). Objects are walked with a sorted merge of
  both key lists: a key in both is diffed, a new key is written, a removed key is deleted. The
  old two-pointer loop never moved past a removed key; that's fixed.
- **Nothing of the same type is written whole.** A value is only written whole when its JSON
  type changes, or when a strategy says `"write"`. So the root is only written on a type change,
  and diffs between values of the same type always apply in place.
- **`strategy(new, old, path)`:** returns `"diff" | "splice" | "skip" | "write"`. It's called
  only for changed objects and arrays, and defaults to `JsonDiffDefaultStrategy` (always `"diff"`).
- **`identity(value)`:** `JsonDiff`'s 5th argument, passed to `JsonDiffArraySplice` for arrays the
  strategy splices. It's called for every element, primitives included, and defaults to
  `JsonDiffDefaultIdentity` (the value itself). Elements whose identities are `===` are the same
  element: matched, and never diffed into. Two different elements sharing an identity is the
  caller's concern.
- **`JsonDiffArraySplice(new, old, identity?)`:** rewritten. It matches elements by identity, trims the shared
  start and end, and keeps the longest run of matched elements still in their old order in place
  (`KeptMatches`, O(n log n)). The worked example in its comments is a test. Bugs fixed: items
  left over at the end were never deleted, and a rotate took n deletes plus n moves.
- **`JsonApplyDiff(root, diff, assign, remove, spliced, clone)`:** applies records in order,
  with no sorting (`JsonDiffOrder` is gone). The cache of the last path walked is cleared below
  each applied record, which fixes a stale-parent edge case. A write or delete at the empty path
  throws (`ReplaceRoot` is gone).
- **`JsonApplySplices(array, splices, clone)`:** one linear pass, written back into the same
  array object. No spread into `splice()`, so large inserts can't overflow the call stack.

### DiffTree (`src/Store/Diff/diffTree.ts`, `utils/diffTree.utils.ts`)
- **Slots hold their homes' objects.** Every keyed value lives at its home (its key in the route
  it's written in), and every other place it appears (a slot) holds that **same object**. There's
  no embedded copy and no snapshot resolver. Homes are only changed in place, so they keep their
  identity. Replacing a home with another type, or with a value with another key, throws.
- **`ApplyValueToPath`** (writes in), in three steps:
  1. A path through a slot is redirected to the first slot's home. A write that would change the
     entity's key writes the changed copy to the slot instead, which gives it a new home.
  2. `Flatten` writes keyed values to their homes and replaces them with the home objects.
  3. The result is diffed into the target in place. `IngestStrategy`: a slot is never diffed
     into, and a nested keyed array is skipped when it holds the same homes, otherwise written
     whole as references.
- **`SpliceValueAtPath`** backs `PushPath` and `SplicePath`: the items are flattened, then
  spliced in place.
- **`Commit` uses `CommitStrategy` and `CommitIdentity`.** Keyed arrays are spliced, matching a
  root-key entity (key not starting with `/`) by its key and everything else by `===`. So editing
  a row commits only its home's change, and the array's scope doesn't fire (L1). A same-key entity the Store reads
  by its root key (any key not starting with `/`) is skipped. A route-key entity is diffed. An
  entity whose key changed is written.
- **`Assign` and `Remove` only clear the parent's snapshot.** Clearing the replaced value's
  snapshot threw away homes' snapshots on every reorder.
- **Removed:** `fixupDiff` and the rebasing, `ExpandKeyedDiffFromValue`, `ApplyPathValues`,
  `GetKeyedPath`, `CreateKeyResolver`, `ResolvedSnapshot`, `ToSnapshotPath` and
  `SnapshotPathRoute`.

### `ObservableNode`
`ApplyDiff` passes callbacks for deletes (they fire the object's scope and the property's) and
for splices (the array's scope fires, and moved elements keep their nodes). The workaround that
followed a root replacement is gone.

### Behaviour that changed on purpose (tests updated)
- Reading through a slot returns the home's current data.
- A key change made through a slot carries the home's current data.
- A nested entity has one home, chosen by its parent's route (no second copy under the outer
  route's keyFunc).
- A field change on a root-key entity commits only the home's change.

## Decided (2026-11-09)

`json.ts` keeps exactly two generic hooks, `strategy` and `identity`, and the DiffTree supplies its
rules through them. There's no separate DiffTree diff walker. Don't add more DiffTree-specific
hooks to `json.ts`.

## Next steps

1. **L1: done.** `Commit` matches keyed array elements by key, through `CommitIdentity`.
   Route-key entities keep `===` matching, because the Store reads their embedded copy.
2. **Rebuild and recopy into builder-app** (see below) after L1, then test there, including
   `tests/perf/store-writes-perf.test.ts` and `tests/perf/result-push-perf.test.ts`.
3. **builder-app changes** (in procedures-engine, not here):
   - **A1:** `writeChanges` awaits each change, so every change is its own `StoreAsync` batch,
     with its own projection run, `Commit` and render. Read kept members from the plain docs
     (`e.after`, or `peekDoc()` for undo) instead of `target.read`, and issue an edit's writes in
     the same tick so they form one batch.
   - **A2:** `storeWrite`'s `copy()` (a JSON round trip) is redundant for plain data:
     `postMessage` clones, and `Flatten` makes the tree's own copy. A 92 MB restore copies
     everything three times. Keep `copy()` only where store proxies can get in.
   - **A3:** the summary projections rebuild every entity's summary. Keep a `WeakMap` from
     entity snapshot to summary, and clear it only when the projection's other reads changed.
   - **A4:** `ResultPushWriter` posts `objectTypes` as an array of unkeyed summaries. Arrays are
     diffed by position, so removing the first of 200 types produced 10,349 records. Post it as
     a record keyed by type name (`Keyed<ObjectTypeResult>`): deletes now make that cheap. The
     comment in `result-push-writer.ts` about arrays moving entries is out of date.
   - **A5 (optional):** keep chained-only projections (`rowDigests`) in a route so they aren't
     committed. A keyed projection's `read` can be absolute (`/rows`).
   - **Optional:** add the direct `j-templates/Store/Diff/...` imports to `optimizeDeps.include`
     in `vite.config.ts`, if the 504 (Outdated Optimize Dep) errors keep happening after a clean
     reload.
4. **Writes as you go (deferred):** rewriting the same 5,000 rows takes ~16–18 ms, against
   ~11.5–12.5 ms at `2985d8f`, because `Flatten` copies every row up front. Instead, diff the
   caller's value directly and swap keyed values for home objects as the diff is applied, so
   only what changed gets cloned.
5. **Flat route map (not started):** replace the `IRoute` tree, `routeCache`, the
   `ROUTE_STATE`-nested state and `routeVersion` with one `Map<routePath, { state, projections,
   keyFunc }>`, plus a `parent → children` index for wildcard reads and `DeleteRoute`. Decide what
   happens to paths that match no route definition.
6. **Cleanup:**
   - The unused `T` on `JsonDiffResult`.
   - Spelling: `commitedSnapshot`, and `PROP_DELIMETER`/`ROUTE_DELIMETER` (exported, so renaming
     is an API change).
   - Mixed `public`/no access modifiers in `diffTree.ts`.
   - The `routeCache` comment says instances are never removed, which `DeleteRoute` contradicts.
   - The Store's `/`-prefix check (`store.ts`) ties it to DiffTree route syntax; a hook the
     DiffTree provides would be better.
7. **Docs and release:**
   - `docs/proposals/diff-tree-routes.md` describes a design that wasn't built (nested DiffTree
     instances, `ROUTE_SUMMARY`) and a test file that doesn't exist.
   - `docs/bugs/diff-tree-8.2-regressions.md` says its fixes are uncommitted; cases 3, 4 and 6
     (moves) no longer apply.
   - Release as **9.0.0** (see breaking changes).

## Breaking changes vs 8.2.0 (for release notes)
- **The `Commit()` / `DIFF_TREE_EVENT` diff format:** no `move` records; `splice` and `delete`
  are new; editing a root-key entity no longer splices the arrays holding it; unkeyed arrays
  arrive by position; records are not sorted. Upgrade the worker bundle
  and the main thread together: a new `PushStore` throws on old `move` records, and an old one
  silently drops splices.
- **`Utils/json`:**
  - `JsonMove`, `JsonApplyWrites` and `JsonDiffOrder` are removed.
  - `JsonDiffArraySpliceV2` is now `JsonDiffArraySplice`.
  - `JsonDiff`'s 4th argument changed from `initResult` to `strategy`, and it takes a new 5th
    argument, `identity`. `JsonDiffArraySplice` takes `identity` as its 3rd.
  - `JsonApplyDiff`'s callbacks are now `(assign, remove, spliced, clone)`.
  - An empty-path write or delete throws.
- **DiffTree:**
  - Replacing a home with another type, or a different key, throws.
  - `ReadPath` returns home objects for slots.
  - Nested entities get a single home.
  - `SplicePath` past the end appends.
- **Store and `ObservableNode.Apply`:**
  - Unkeyed arrays update by position: nodes stay at their index instead of following their
    object.
  - Embedded copies of root-key entities are no longer updated, which only matters to code
    reading raw values via `Unwrap`.

## builder-app test copy
- On 2026-11-06, `lib/` from `npm run build` was copied over
  `builder-app/node_modules/j-templates/`. That copy has **neither the delete record nor the
  no-root-replacement change**: rebuild and recopy before testing.
- The original 8.2.0 package was backed up to the Claude session scratchpad
  (`/tmp/claude-1000/.../scratchpad/j-templates-8.2.0-backup`). That may be gone; `npm install` in
  builder-app restores the published 8.2.0.
- Run builder-app's dev server with `--force` after copying, and reload the browser with the
  cache disabled, to avoid 504 (Outdated Optimize Dep) errors.

## Gotchas
- **Don't emit `.js` into `src/`.** `npx tsc -p tsconfig.json` with extra `--outDir`/`--rootDir`
  flags did that once, and Vite resolves `.js` before `.ts`, so vitest silently tested the stale
  files. Build with `npm run build` (writes to `lib/`), or compile single files into a scratch
  `--outDir`. If tests disagree with the source, look for untracked `src/**/*.js`.
- **`JsonApplyDiff`'s callbacks are positional.** TypeScript accepts a function with fewer
  parameters in any slot, so a callback passed in the wrong position still type-checks.

## Benchmark (5,000 keyed rows, best of 7: `2985d8f` → working tree)

| Case | `2985d8f` | Working tree |
|---|---|---|
| Initial write + commit | ~17 ms | ~15–17 ms |
| Rewrite the same rows | ~11.5–12.5 ms | ~16–18 ms |
| Insert first row | ~40 ms, 5,003 records | ~20 ms, 2 records |
| Move last to front | ~39 ms, 5,000 records | ~21 ms, 1 record |
| Edit one field | 1.8 ms | 1.1 ms |
| Splice delete first | 3.2 ms, 5,000 records | 1.1 ms, 1 record |
