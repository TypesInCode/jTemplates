# Note: a store reads a root's snapshot reactively

Status: built (2026-11-16), unreleased. `ObservableNode.Snapshot` is reactive, `ObservableNode.JSON` is the non-reactive read, and `ReadStore.GetSnapshot(key)` reads a root's snapshot. Tests: `test/store/store-snapshot-read-test.ts` and `store-snapshot-read-test-async.ts`. Breaking: a scope that read `Snapshot` relying on it registering nothing now re-runs (below). builder-app still works around the old behaviour until it upgrades (Use case, below).

## What it was

A store's root is a node tree: `Get(key)` reads the root's property on its root node, which registers the reader on that one property, and hands out the root's proxy. A reader that wants the root as plain data takes `ObservableNode.Snapshot` of it: immutable, cached per raw value, rebuilt lazily after a write along the changed path only, sharing every untouched part with the last snapshot, and resolving keyed children through their own roots.

A snapshot read registered nothing. A post applies inside a root in place (`ObservableNode.ApplyDiff`), which updates only the scopes of what it changed. The root's property, the one scope `Get` registered, still holds the same object, so it isn't updated. The cached snapshot was cleared, so a fresh read would see the change, but a reader of the snapshot wasn't told to read again.

## What was built

The reactivity is on the node, not the store:

- **Each node wrapper has a snapshot scope** (`NODE_SNAPSHOT`), a `Basic` scope created on the first `Snapshot` read of that node. `Snapshot(node)` reads it with `ObservableScope.Value`, so the reader registers on it.
- **Invalidation wakes it.** A write invalidates the written value's cached snapshot and every cached ancestor's (`Snapshot.Invalidate`, which now takes a callback). For each cache entry it deletes, the callback updates that node's snapshot scope. Only cached snapshots are deleted, so the first record of a post wakes the readers up the path, and later records in the same post stop at the first ancestor that's already cleared: one wake per post per node read, with no hook in the store.
- **Keyed children wake their parents.** A parent's cached snapshot is linked to each keyed child's it embeds, so a post to the child's root invalidates the parent's snapshot and wakes its reader.
- **Any node, not only a root.** `Snapshot(store.Get("doc").section)` wakes for changes under `section` and not for its siblings, and a node from `ObservableNode.Create` works the same way.
- **`ObservableNode.JSON(node)`** returns the same cached snapshot without registering, through the node's `toJSON`. `JSON.stringify(node)` and `node.toJSON()` stay non-reactive, as does any read inside `peek()`.

The store read:

```ts
store.GetSnapshot<T>(key: string, defaultValue?: T): T | undefined
```

- **Reads the root as `Get` does**, in the caller's scope, so a demand root (`StoreAsync`'s `demand`) sees a reader and is subscribed, and released when the reader goes. Root creation, replacement and deletion wake the reader through the root property, as they do for `Get`.
- Returns `ObservableNode.Snapshot` of the root, or the value itself when it isn't a node: a value root, or an opaque root's raw value.

Nothing changes for proxy readers or for the tree, and nothing is copied per post: the snapshot is rebuilt when it's read, along the path the post changed.

**Rejected on the way:**

- *A `Basic` scope per root in the store, its getter reading `Get`.* A `Basic` scope's getter runs untracked, so the root property never saw a reader: a demand root read this way was never subscribed, and a store watch never fired.
- *A dynamic scope per root (`ObservableScope.Create`).* The cached scope, not the reader, became the root property's listener, and it's never destroyed, so a demand root read once stayed subscribed for the store's life, and a read outside a scope subscribed it.
- *`Snapshot` returning a non-node as it is.* Code uses `Snapshot(x) !== undefined` as a node check; `GetSnapshot` passes a non-node through itself instead.

## Breaking change

`ObservableNode.Snapshot(node)` read in a scope now re-runs it when anything under the node changes. Code that took a snapshot in a scope to read without subscribing should use `ObservableNode.JSON(node)`, which keeps the old behaviour exactly, or read in `peek()`. Replacing every existing `Snapshot` call with `JSON` is a migration that changes nothing; then switch the reads that should wake back to `Snapshot`.

## Use case: builder-app's engine results (2026-11-15)

procedures-engine's builder-app (`builder-app/docs/result-demand-proposal.md`, "Promoted keys") needs this.

**The setup.** The engine worker's `ObservableDiffTree` builds the result index as projections. Each entity of the document run (an object type, a procedure's result, its guards, a Slice, a router, an emit's sources) is promoted to a root of its own by its part's projection `keyFunc`, e.g. `$projection_slices_slice:CUSTOMERS`. The main thread's `StoreAsync` receives those roots on demand (`demand: ["$projection_slices_slice:*", …]`), only while a view reads them. Sizes on the UE-01 workload: a type up to 5.8 MiB, a Slice up to 16 MiB, a procedure up to 1.7 MiB.

**What the reader needs.**

- **Plain data, not the proxies.** The views read an entity as its snapshot. Reading through the proxies registers one dependency per property read, and walking a large entity that way took 19 s (a router's case table).
- **To wake when anything in the root changes**, which a snapshot read didn't give (above).
- **Diffs on the wire.** An opaque root would wake the reader, but the tree must write it whole, so every change would post the whole entity: 16 MiB for one member's change while a Slice's sheet is open, where the diff is a few records. A whole new object each post also loses the snapshot's sharing, so a sheet over it would rerender every row instead of the ones that changed.

**Why not opaque writes** (`store-opaque-writes.md`, a store taking records inside an opaque root by copying along their paths). It would give the reader the same thing, structurally what a snapshot rebuild produces, but eagerly on every post whether anyone reads it, and an opaque root resolves no keyed children: `Get` returns the box's raw value, so an embedded keyed copy stays as it was written. That doesn't matter to builder-app's engine store (its endpoint has no keyFunc), but it would to a keyed store such as builder-app's project store. The snapshot read keeps the node tree, the lazy rebuild and key resolution.

**The workaround, until builder-app upgrades.** `ResultStore extends StoreAsync` overrides the protected `UpdateRootMap` to count the posts applied to each root in an `ObservableNode` record (`Changes(key)`, read reactively), and builder-app's `demandIndex` reads an entity's count with its snapshot (`builder-app/src/services/engine/result-demand-index.ts`). `GetSnapshot` replaces it: `demandIndex` reads `store.GetSnapshot(root)`, and `ResultStore` goes. `view-service`'s `snapshot`, a Basic scope it updated after each view write, is the same workaround and becomes `ObservableNode.Snapshot(state)`. builder-app's `snapshotOf` (`services/project/store.ts`), behind `view-service`'s `peek()`, becomes `ObservableNode.JSON`, as do the one-off reads in `engine-service` (`whenEntity`, the run outcome). `project-service`'s `takeSnapshot()` stays: it assembles the document from several roots once per change, after all of the change's writes, so readers never see a document with some roots written and others not; a reactive read of each root would wake them once per root.

## Settled

- **Keyed children** wake the parent's reader (above).
- **One wake per post per root**, from the invalidation. A commit that touches many held roots still posts once per subscription (`store-demand-roots.md`, open question 3), so a reader of several roots wakes once per root; grouped posts would make it one wake across roots.
- **The name.** `GetSnapshot(key)` beside `Get(key)`.
