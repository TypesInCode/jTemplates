# Next steps (2026-11-15)

Released as **10.0.2**, on `master`. What's open is below; the proposals and notes it links to are in
`docs/proposals/`, and the bugs found by apps in `docs/bugs/`.

## Done

- **9.0.0: the DiffTree and JSON diff rework** (`fe1ef85`, `9ae12a2`). Diff records are `write`, `delete`
  and `splice`; `JsonDiff` takes a `strategy` and an `identity`; keyed values live at one home and every
  slot holds the same object; `Commit` splices keyed arrays, matching root-key entities by key; the
  DiffTree internals are split under `src/Store/Diff/utils/` (`paths`, `state`, `homes`, `routes`,
  `projections`). The breaking changes against 8.2.0 are in `fe1ef85`'s commit message, and the
  full list was in this file before 2026-11-15 (`git show 73bed29:NEXT_STEPS.md`).
- **10.0.0: DiffTree push and endpoints.** `DiffTreeEndpoint` (`Define`, `FollowRoute`, `Host` with
  `onFollow` and `onConnect`, `Connect`); `new ObservableDiffTree({ endpoint, keyFunc, routes, opaque })`;
  `DiffTreeHub.Register(endpoint, factory)`, a factory returning a worker or a tree, `Open` / `OpenLocal`,
  `KindOf`; `StoreAsync` and `StoreSync` over leases, owning them; restart without reseed;
  `StoreSync.Destroy`; `@ComputedAsync` removed; `npm test` type-checks the tests. The model is
  [docs/patterns/05-difftree-endpoints.md](docs/patterns/05-difftree-endpoints.md); the design and its
  measurements, [docs/proposals/diff-tree-push.md](docs/proposals/diff-tree-push.md).
- **10.0.1: demand roots.** `Emitter.Watch`, a store's root watch (`ReadStore`'s `watch`,
  `ObservableNode.WatchProperty`), `StoreAsync`'s `demand` and `demandDebounce` with `Hold`, and
  `Utils/pattern.ts` ([docs/proposals/store-demand-roots.md](docs/proposals/store-demand-roots.md)). A
  store no longer marks its tree opaque (`jt-markopaque` is gone).
- **10.0.2: promoted projection keys.** A projection's `keyFunc` (reads and keyed projections) holds each
  outermost keyed value of its output at a root of its own, `<output>_<key>`, as the same object the output
  holds, so a subscriber can follow one entity (`test/diffTree/diffTree-test.ts`, "promoted keys").
  builder-app's engine results are built on it.
- **Unreleased: reactive snapshots.** `ObservableNode.Snapshot(node)` registers its reader on a snapshot
  scope on the node, woken when a write invalidates the node's cached snapshot: anything under the node,
  a keyed child's root included, once per post. `ObservableNode.JSON(node)` is the same snapshot read
  without subscribing (as `toJSON` and `JSON.stringify` are). `ReadStore.GetSnapshot(key, default?)` reads
  a root as `Get` does, so a demand root is subscribed, and returns its snapshot, or a value or opaque
  root as it is ([docs/proposals/store-snapshot-read.md](docs/proposals/store-snapshot-read.md);
  `test/store/store-snapshot-read-test.ts`, `-test-async.ts`). Replaces builder-app's
  `ResultStore.Changes`.

### Breaking in the next release

`ObservableNode.Snapshot(node)` read in a scope now re-runs the scope when anything under the node changes;
before, it registered nothing. Code that relied on that reads `ObservableNode.JSON(node)` instead, which
returns the same object without subscribing, or reads in `peek()`. Changing every `Snapshot` call to
`JSON` keeps the old behaviour; then switch back the reads that should wake. Since it's a change in
behaviour, not in types, a `^10` dependency would take it silently: release it as a major version.

### Breaking in 10.0.0

`Register(name, factory, { sources })` is `Register(endpoint, factory)`; `new StoreAsync(channel, keyFunc?,
options?)` is `new StoreAsync(channel, { keyFunc?, roots?, opaque? })`, and `new StoreSync(keyFunc?, routes?,
options?)` is `new StoreSync(tree?, { keyFunc?, roots?, opaque? })`, where `tree` is a local lease, an
`ObservableDiffTree` (for routes; the store doesn't own it), or left out for an empty tree of the store's own.
A store takes a lease's keyFunc from the endpoint and a given tree's from the tree
(`ObservableDiffTree.KeyFunc`); a `keyFunc` given there too throws, as does a tree config with both
`endpoint` and `keyFunc`. A store over a lease releases it. `new ObservableDiffTree(keyFunc?, routes?)` is
`new ObservableDiffTree({ endpoint?, keyFunc?, routes?, opaque? })`, and the endpoint gives the tree its
keyFunc and follow routes (`DiffTreeEndpoint.FollowRoutes` is gone). An endpoint has no `opaque`: the tree
and its stores share theirs from a file both import, and `Host` checks the tree was built from the endpoint
(or from none, for an endpoint with no sources). `StoreAsync.Reconnect` is private. `IWorkerOptions` is
`IRegisterOptions`, `WorkerFactory` is `TreeFactory`. `DiffTreePublisher` is `ObservableDiffTree`
(`Store/Diff/observableDiffTree`) and extends `DiffTree` (every change calls its protected `BeforeChange()`).
`StoreSync.Publisher` is `StoreSync.Tree`. `WorkerHub` is `DiffTreeHub` (`Store/Diff/diffTreeHub`).

## Open

### Stores

- **Opaque, the rest of it:** `Store` applies records inside an opaque root by copying along each record's
  path and boxing the new root, instead of throwing
  ([docs/proposals/store-opaque-writes.md](docs/proposals/store-opaque-writes.md)). Until then a store can
  hold fewer keys whole than its tree, not more.
- **Demand roots, follow-ups** ([store-demand-roots.md](docs/proposals/store-demand-roots.md)): the
  benchmark of `Emitter.On`/`Remove` without a watcher (phase 1); a reader of many demand roots wakes once
  per root (open questions 2 and 3: several subscriptions per `jt-subscribe`, one post per commit); a
  pending state, `IsPending(root)` (open question 5, and diff-tree-push.md's §Pending state).
- **Structural writes, what's left** ([store-structural-writes.md](docs/proposals/store-structural-writes.md)):
  typed paths for `Push`/`Splice`/`Patch`, a debug check that the diff side and the node side agree,
  freezing snapshots in development builds, and errors thrown as strings (`store.ts`'s opaque error is one).

### DiffTree

- **Promoted keys, edges** (`Projections.Promote`, `utils/projections.ts`):
  - `<output>_<key>` can collide with another projection's output (`$projection_a` promoting key `b_c`
    against a projection named `a_b` promoting `c`); nothing checks.
  - A key must not contain `.` or `/`, since the root key is a path's first segment; the app escapes
    them (builder-app's `entityKey`). Nothing checks.
  - Duplicate keys throw only among the values that changed since the last run; a changed value reusing
    the key of an unchanged one isn't caught.
- **Writes as you go (deferred):** rewriting the same 5,000 rows takes ~16–18 ms, against ~11.5–12.5 ms
  before 9.0, because `Flatten` (`utils/homes.ts`) copies every row up front. Instead, diff the caller's
  value directly and swap keyed values for home objects as the diff is applied, so only what changed is
  cloned.
- **Flat route map (not started):** confined to `routes.ts` and `RouteState` in `state.ts`; replace the
  `IRoute` tree, its lookup cache, the `ROUTE_STATE`-nested state and the route version with one
  `Map<routePath, { state, projections, keyFunc }>`, plus a `parent → children` index for wildcard reads
  and `DeleteRoute`. Decide what happens to paths that match no route definition.
- **`Commit`'s pass over every root key:** about 4–5 ms at 20k keys with the `Peek` check. Write tracking
  would remove it; only if a workload needs it.
- **Two older bugs** ([docs/bugs/diff-tree-8.2-regressions.md](docs/bugs/diff-tree-8.2-regressions.md),
  "Open"): `JsonDeepClone` turns a `__proto__` key into the prototype (`SetOwnProperty` handles it, and
  `JsonMaintainUnchanged` uses it), and a route segment named like an `Object.prototype` member (`constructor`)
  resolves to that member in `RouteState`.

### Later

- **A reactive hub:** [docs/proposals/reactive-hub.md](docs/proposals/reactive-hub.md). A draft, deferred.
- **`@ComputedAsync`**, rewritten over the hub, if wanted.

### Cleanup

- The unused `T` on `JsonDiffResult`.
- Spelling: `commitedSnapshot` (`diffTree.ts`), and `PROP_DELIMETER` / `ROUTE_DELIMETER` (`utils/paths.ts`,
  exported, so renaming is an API change).
- Mixed `public` / no access modifiers in `diffTree.ts`.
- The Store's `/`-prefix check (`store.ts`) ties it to DiffTree route syntax; a hook the DiffTree provides
  would be better.

## Decided (2026-11-09)

`json.ts` keeps exactly two generic hooks, `strategy` and `identity`, and the DiffTree supplies its rules
through them. There's no separate DiffTree diff walker. Don't add more DiffTree-specific hooks to `json.ts`.

## Gotchas

- **Don't emit `.js` into `src/`.** `npx tsc -p tsconfig.json` with extra `--outDir`/`--rootDir` flags did
  that once, and Vite resolves `.js` before `.ts`, so vitest silently tested the stale files. Build with
  `npm run build` (writes to `lib/`), or compile single files into a scratch `--outDir`. If tests disagree
  with the source, look for untracked `src/**/*.js`.
- **`JsonApplyDiff`'s callbacks are positional.** TypeScript accepts a function with fewer parameters in any
  slot, so a callback passed in the wrong position still type-checks.
