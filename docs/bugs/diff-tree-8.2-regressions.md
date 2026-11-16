# DiffTree 8.2.0: regressions found in builder-app, and their fixes

**Found:** 2026-10-23, j-templates 8.2.0, moving builder-app (procedures-engine, branch
`feature/result-index-worker`) to the DiffTree rewrite. The result index's `ResultPushWriter` got faster
on 8.2.0. The project store, which keeps every entity as a root key (about 20k on the TR-13 perf
workload) and writes small edits, got 5–50× slower, and one reactivity bug came back.

**Status (2026-11-15):** fixed and released in 9.0.0; builder-app runs on 10.0.2. The 9.0 JSON diff
rework replaced several of the fixes below, so read them as history:

- Cases 1, 5, 7, 8 and 9 hold as described, with the names of 9.0: `Snapshot.Child` takes no `path`,
  and `PROP_DELIMETER` is in `Store/Diff/utils/paths.ts`.
- Case 2: projections now keep their last output's objects wherever an output is unchanged
  (`JsonMaintainUnchanged`, `utils/projections.ts`), which is next step 4's output reconciliation, built.
  `JsonHasChanges` is still exported, unused by the tree.
- Cases 3, 4 and 6 are gone with `move` records: arrays are diffed by position, or spliced by identity
  (`JsonDiffArraySplice`); `JsonDiffOrder` and `NewIndexOf` are removed and records apply in order.
- Case 10: `CreateKeyResolver` is removed; slots hold their homes' objects, so there is no resolver.

What's still open is under "Open", at the end.

The common thread: 8.1.0 scoped its work to what a write touched. It read each projection input by its
own path, and diffed each write where it happened. 8.2.0 removed 8.1.0's costly part, diffing and cloning
every projection output, but also reads, splices and commits through snapshots of a whole route. In the
project store the root route is the whole document. Most of the fixes put the scoping back without
bringing back the output diffing.

## Measurements

`tests/perf/store-writes-perf.test.ts` in builder-app: an edit and its undo through `ProjectService` on a
`StoreSync`, best of three, 50 ms budget. "Now" is two runs on the working tree, with the builder's rows in
one `rows` root (see [Builder-side changes](#builder-side-changes)).

| Edit | 8.1.0 | 8.2.0 | Now |
|---|---|---|---|
| Add node | 33 ms | 410 ms | 23–24 ms |
| Append row (5,000 rows) | 28 ms | 182 ms | 34–40 ms |
| Insert first row | 25 ms | 1,396 ms | 39–43 ms |
| Delete the 5,000-row Type | 46 ms | 646 ms | 32 ms |

Undoing a node or Type deletion takes 165–175 ms on every version (the spec's known failure). The
result-push perf spec is unchanged by these fixes, within noise; the projection edit publishes in 127 ms
against 121 ms.

How each fix moved it, from 8.2.0:

| Step | Add node | Append row | Insert first row | Delete Type |
|---|---|---|---|---|
| 8.2.0 | 410 | 182 | 1,396 | 646 |
| Cases 2–4: output cutoff, linear moves, diff ordered once | 192 | 155 | 157 | 312 |
| Cases 5–6: per-key commit, suffix skip, no array copies | 182 | 139 | 148 | 279 |
| Case 7: path-scoped reads | 125 | 107 | 111 | 177 |
| Builder: one `rows` root, spliced (needs case 8) | 56 | 68 | 70 | 66 |
| Cases 9–10: scoped push/splice reads, resolver fast path | 23 | 34 | 39 | 32 |

All in ms. The builder row isn't comparable with the rows above it by library change alone: it also
replaces the builder's root-wide `rowDigests` read (see below).

---

## 1. An array that only shrinks doesn't update its readers

**Symptom.** A `data:` list over a `@Computed` array that gets shorter keeps its old items
(builder-app `computed-shrink.test.ts`, `picker.test.ts`). It's the 8.0.2 bug again.

**Cause.** Since `JsonDiffArrays`' common-prefix skip, a diff that only shrinks an array is a single
`length` write. `NodeValueSet` decided whether a property has its own scope with
`Object.hasOwn(wrapper, prop)`. An array's wrapper is a real array, so its own `length` (0) passed, the
array scope was never updated, and `wrapper.length` isn't a scope either.

**Fix.** `src/Store/Tree/observableNode.ts`, `NodeValueSet`: an array wrapper has no property scopes.

```ts
const propScopeExists = !!prop && !wrapper[ARRAY_SCOPE] && Object.hasOwn(wrapper, prop);
```

**Test.** `observableNode-test.ts`: a length write that shrinks an array updates a scope over the array.

## 2. A projection reading another one reruns when its source comes out the same

**Symptom.** In builder-app, the card summaries read `$projection_effectiveProps`. They reran whenever
`effectiveProps` reran, even when its result was unchanged.

**Cause.** 8.2.0 writes an output as it comes, without a diff, which avoids copying large outputs down a
chain. A rebuilt output is a new object, and the reader compares its inputs by reference, so it reruns.
The commit still posted nothing, so this was wasted work in the worker only.

**Fix.** A plain equality check, `JsonHasChanges(newValue, oldValue)` in `src/Utils/json.ts`. It builds
nothing and copies nothing, stops at the first difference, and skips any subtree both values share by
`===`, so it walks only what the projection newly built. Arrays are compared by position, keys without
sorting, and an `undefined` property counts as absent.

- `RunProjections` (`diffTree.ts`): an output equal to the last one written isn't written. The last
  output's objects stay, so its readers are skipped.
- `RunKeyed` (`KeptOutput`): an entry that recomputes to an equal output keeps its last object, so a keyed
  projection where only equal outputs come back returns `UNCHANGED`.

This doesn't bring back 8.1.0's output diffing: no write records are built, and nothing is cloned.

**Tests.** `json-test.ts` (`JsonHasChanges`: equal and changed values, `undefined` keys, inherited keys,
stopping at the first change); `diffTree-test.ts` ("outputs the same as the last").

## 3. Diffing an array with an element added near its start is quadratic

**Symptom.** Inserting a row at the front of 5,000 took 1.4 s.

**Cause.** `JsonDiffArrays` found where each old element went with `newValue.indexOf(…)`, for every old
element after the common prefix. That is 5,000² comparisons, and one `move` per shifted element.

**Fix.** `NewIndexOf` in `json.ts`. Past `MOVE_SCAN_LIMIT` (32) elements after the prefix, it builds a
`Map` from value to its first index once, from the end so the first index of a repeated value is the one
kept, and returns `-1` for `NaN` as `indexOf` does. The moves come out exactly as with `indexOf`; only the
strategy depends on the length.

**Tests.** `json-test.ts`: on arrays past the limit, the moves equal an `indexOf` reference, with repeated
values, `NaN` and missing values. A front insert into 5,000 moves every element by one and applies
correctly. A front insert's diff now takes 2.7 ms.

## 4. `Commit()` sorts the whole diff once per root key

**Symptom.** After the front insert, `Commit()` took 307 ms, nearly all of it in `JsonDiff`'s `sort`.
Every commit also got slower with the number of root keys.

**Cause.** `Commit()` called `JsonDiff(…, initResult)` once per root key, passing its result so far. Each
call sorted that whole result (moves first), so a commit with thousands of entries and keys sorted
thousands of times.

**Fix.** The diff and the ordering are separate exported functions in `json.ts`:

- `JsonDiffInto(newValue, oldValue, path, result)` appends records without ordering.
- `JsonDiffOrder(result)` puts moves first in one stable, linear pass, in place.

`JsonDiff` is the two together, so its output is unchanged. `Commit()` calls `JsonDiffInto` per key and
orders once at the end. The front insert's commit went from 307 ms to 18 ms.

**Test.** `json-test.ts`: several values diffed into one result, then ordered, moves first, each in the
order found.

## 5. `Commit()` rebuilds a snapshot of the whole root

**Cause.** `Commit()` took `Snapshot.Get` of the whole root state: a new object, with a link and a child
snapshot for each of about 20k keys, then diffed it key by key.

**Fix.** `Commit()` treats the root as the flat record it is.

- The committed state is a `Map` of each root key's snapshot, updated in place.
- For each key, `Snapshot.Peek(value)` (one `WeakMap` lookup) is checked first. If it still returns the
  committed snapshot, the key is unchanged and nothing else happens. A primitive is compared as it is.
- Otherwise the key's snapshot is taken with the new `Snapshot.Child(state, parent, key, resolve, path)`
  (`snapshot.ts`), which is the snapshot the root's own snapshot would hold for that key: cached, keyed
  children resolved, and linked to the parent.
- A key that left the root is looked for only when fewer committed keys were seen than were committed.

This needs no write tracking. A one-field change among 40k root keys commits in about 44 ms, down from
176 ms. Most of what remains is legitimate: the write invalidates the array that embeds the entity, whose
snapshot is rebuilt.

## 6. Array diffs copy both arrays, and re-scan an unchanged tail

**Cause.** For one changed slot in the middle of a long array of the same length, `JsonDiffArrays`
skipped the common prefix only, then built the move map over the whole rest. It also copied both arrays
(`slice()`) to mark moves, and built every element's path even when the element was skipped.

**Fix.** In `json.ts`:

- When both arrays have the same length, a common-suffix skip limits the diff to the changed middle. An
  element moved within the middle is found there (`NewIndexOf` takes an end index).
- Moves are tracked in two small sets (`movedFrom`, `movedTo`) instead of copies of both arrays.
- An element's path is built only when the element is diffed.

**Test.** `json-test.ts`: only the changed middle of an array of the same length is diffed; a swap of two
elements far apart is two moves that apply correctly.

## 7. Projection reads snapshot the whole route

**Symptom.** With cases 3–6 fixed, store writes were still 3–6× 8.1.0. Snapshot creation and `ReadPath`
dominated the profile, under `RunProjections`.

**Cause.** `ReadValue` read a path through `Snapshot.Get` of the whole route state, then read the
property. In the root route that's every root key. A write anywhere invalidates the route's snapshot, so
every projection that ran after a write rebuilt it. `RefreshSources` rebuilt it again after each output
write, since outputs live in the route too.

**Fix.** `diffTree.ts`. A read with a property path snapshots only the route state's first segment
(`Snapshot.Child`), then walks the rest. A read of the whole route (`""`, as a keyed projection without
`read` makes) still snapshots the route.

- `IRouteSource` has an optional `key`. With one, `snapshot` is that key's snapshot.
- `SourceUnchanged` reads `state[key]` again and `Peek`s it, so a key written with a new value counts as a
  change. A value with no cached snapshot counts as changed, including a key that read as missing before.
  Treating that as unchanged was a bug in the first version of this fix, caught by an existing test.
- `RefreshSources` re-snapshots a key-scoped source after an output write only if the write was under that
  key.
- `PROP_DELIMETER` is exported from `diffTree.utils.ts`.

**Tests.** `diffTree-test.ts` ("path-scoped reads"):

- A write to another key neither reruns nor re-reads.
- Replacing the key's value, or writing under a keyed entity it holds, reruns.
- An output write doesn't make the next run re-read.

The wildcard test that counted `Snapshot.Get` calls now counts `Snapshot.Child`.

## 8. Push, Splice and Patch only take a root key

**Use case.** builder-app moved every Type's rows into one root (see below) and needed to splice one
Type's rows at `rows.<typeKey>`. Writing those rows whole instead was slower: a fresh 5,000-row copy shares
nothing with the stored rows, so it's diffed by content. That took 114 ms for an append and 363 ms for a
front insert.

**Cause.** `DiffTree.SplicePath` and `PushPath` already handle a dotted path: a front insert at
`rows.t_a` with its commit takes 20 ms, a push 4.8 ms. But `StoreSync` and `StoreAsync` refused any key the
store doesn't hold as a root (`Has(key)`).

**Fix.** `src/Store/Store/store.ts` adds `RootOf(path)` (the text before the first `.`) and a protected
`HasRootOf(path)`. `Patch`, `Push` and `Splice` on `StoreSync` and `StoreAsync` check the path's root.
`StoreAsync`'s pending-write set is keyed by root, so a change to a path in a root that's being written
isn't refused.

**Behaviour change.** This reverses the rule in 05c1d4a that rejected a splice on a dotted path. The
"a dotted path, changing nothing" case in `test/store/splice-cases.ts` is replaced by "at a dotted path":

- It splices an array inside a root.
- Later pushes and writes by index find the members where they are.
- A path in a root the store doesn't hold is still rejected.

## 9. Push and Splice snapshot the whole route to read an array's length

**Symptom.** With the rows spliced, a push or splice of one row still cost about 13 ms.

**Cause.** `PushPath` and `SplicePath` called `this.Snapshot(routePath)` to find the array and its length.
In the root route that rebuilt the 20k-key root once per edit, because the previous write had invalidated
it.

**Fix.** `diffTree.ts`: both read the array through `ReadValue(path)`, the path-scoped read from case 7.
Keyed entities still resolve as before, but the route isn't rebuilt.

## 10. The keyed resolver builds and parses a path for every child

**Cause.** Every snapshot rebuild calls the resolver for each child. `CreateKeyResolver` built the
child's route string (`SnapshotPathRoute`), joined the key path, then parsed it back (`ReadPath`,
`ToSnapshotPath`). With 5,000 keyed rows, that cost added up in every rebuild of their array: in the push
or splice, in a projection's read, and in the commit.

**Fix.** `diffTree.utils.ts`, `CreateKeyResolver`: a fast path for a child in the root route, whose
snapshot path holds no `ROUTE_STATE`. Its key function is the root route's, and a key without `/` or `.`
resolves straight to `root[key]` with path `[key]`. That gives the same result as the general path. Keys
with `/` or `.`, and children inside routes, take the general path.

---

## Builder-side changes

These were made in builder-app, and depended on case 8, so they needed the release with these fixes (they
have since landed there):

- **Projections moved to 8.2.0 routes.** `projectRoutes` holds the projections in the root route.
  `docProjection` takes reads by position, and a root the store doesn't hold yet reads as an empty
  collection.
- **One `rows` root.** Every Type's rows are in `rows`, a record by Type key (`ROWS_ROOT`,
  `rowPath(typeKey)` in `doc-roots.ts`), in place of one `rows:<typeKey>` root per Type.
  - The project writes the root at start-up, and writes it whole on restore.
  - Membership changes are pushes or splices at `rows.<typeKey>`, and their undos are too
    (`writeChanges`, for `c.root === ROWS_ROOT`). A keyed array inside an entity is still written whole.
  - `docState`'s `rows[typeKey]` reads the root's proxy by key, so a reader wakes only for its own Type.
- **`rowDigests`.** 8.2.0 wildcards match route segments, not store keys, so `rows:*` couldn't be read.
  `rowDigests` is a keyed projection with `read: "rows"`. Each Type's digest holds its object count, and
  how many objects have each set of values. `incompleteCounts` and `typeSummaries` read it, and
  `typeSummary` takes an optional object count.
  - The first version of `rowDigests` was a keyed projection over the root's own state, a whole-route
    read. That one projection cost about 60–130 ms per edit, until the rows moved into one root.
- **`projection-reads.test.ts`.** The pins match the behaviour after case 2: a chained projection is
  skipped when its source comes out the same, and `Snapshot`, not `ReadPath`, resolves keyed entities.

## Open

Still open in jTemplates (also in `NEXT_STEPS.md`):

- **Two older bugs**, from before 8.2.0: `JsonDeepClone` turns a `__proto__` key into the prototype
  (`SetOwnProperty` in `json.ts` handles it, and `JsonMaintainUnchanged` uses it), and a route segment
  named like an `Object.prototype` member (`constructor`) resolves to that member in `RouteState`. The fix
  for the second is prototype-free route state records.
- **`Commit()`'s pass over every root key**, only if it shows up: about 4–5 ms at 20k keys with the
  `Peek` check. Write tracking would remove it, but every write path, keyed-entity writes included, would
  have to record the root keys it touches.

builder-app's side, tracked there: `rowsDigest` re-digesting a Type's rows whole on any change (about 6 ms
per row edit on 5,000 rows), splicing keyed arrays inside entities (`t_1.props`, written whole today), and
its docs on the single `rows` root.

## Next steps (2026-10-23), resolved

1. Release jTemplates with case 8's behaviour change: done, 9.0.0.
2. Upgrade builder-app and check the numbers: done; builder-app is on 10.0.2.
3. The builder's docs: builder-app's side.
4. Output reconciliation: built, as `JsonMaintainUnchanged` (see Status).
5. and 6. builder-app's side (under "Open").
7. and 8. Under "Open".
