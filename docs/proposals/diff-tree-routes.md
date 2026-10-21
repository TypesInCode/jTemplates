# Proposal: Routes in a DiffTree

Status: implemented in `src/Store/Diff/diffTree.ts`, tested in `test/tree/diffTreeRoutes-test.ts`, including removing an instance (`DeleteRoute`). Reading parent state is undecided (see Open questions).

## Summary

A route is a slice of internal state inside a `DiffTree`, addressed by a path such as `/channel/0001`. Each route instance is itself a `DiffTree`, with its own root-state object, keyed entities and projections. All of them live in one shared root state, under a non-enumerable symbol key. Only its **summary** reaches the parent's root state, under an output key named by the route pattern's first fixed segment (`channel`), and only the parent's root state is pushed to a connected Store.

Routes are a memoization guard for complex data. Work inside an instance (writes, projections, intermediate state) stays internal. The Store sees a change only when an instance's summary changes, and then only the part of the summary that changed.

The mechanism is composition: a parent `DiffTree` is given a definition for each route pattern, and creates a standard `DiffTree` from it the first time a path matching that pattern is written to.

## Motivation

Today every write and every projection result lands in root state, and root state is what the Store receives. Projections help derive values, but their inputs still live in root state and still cross to the Store. Some data has a lot of working state behind a small result: per-channel caches, indexes, partial loads. That state has to be either pushed to the Store unused or managed outside the `DiffTree` by hand.

Routes give that working state a home inside the tree, scoped per instance, with a declared summary as the only way out.

## Design

### Defining a route

A route is a pattern and a definition: a projector factory and, optionally, the instance's own routes. The summary is one of the instance's projections, under the reserved id `ROUTE_SUMMARY` (`"$summary"`).

```ts
const tree = new DiffTree(KeyFunc, projector, {
  "/channel/{channelId}": {
    projector: ({ channelId }) => new SequentialProjector({
      unread: { reads: ["messages"], projection: (_keys, messages) => CountUnread(messages) },
      [ROUTE_SUMMARY]: {
        reads: ["metadata.name", "$projection_unread"],
        projection: (_keys, name, unread) => ({ name, unread }),
      },
    }),
  },
});
```

- A route is registered as a pattern string and a definition (`IDiffTreeRouteDefinition`). Every part of the definition is optional.
- The parent creates each instance as a standard `DiffTree`, with the parent's `keyFunc`, the definition's projector and routes, and two internal constructor arguments: the parent, and the instance's base path. The instance then shares the parent's root state and snapshot cache.
- `projector` receives the route config: the params the path matched, by name. For `/channel/{color}/{size}` and the path `/channel/red/large/...`, that's `{ color: "red", size: "large" }`. It's called once per instance; a projector keeps per-tree state, so it must return a new one each call. A summary that needs the config closes over it.
- The pattern's **first fixed segment is its output key**: the parent root key the route's summaries are written to (`channel` for `/channel/{channelId}`). A pattern must start with a fixed segment.
- **The summary is a projection.** Whichever projection strategy the instance uses applies to it: its reads (paths in the instance's state, or other projections in the instance, like `$projection_unread`) order it after its dependencies and decide when it re-runs. `TrackedProjector` tracks what it actually reads, for finer dependencies.
- **There's no default summary.** A route whose projector has no `ROUTE_SUMMARY` projection (or that has no projector) writes nothing to the parent: its state is purely internal.

The definition stays this small. If composing routes needs more than this, the feature should be reconsidered.

### Route paths

A path starting with `/` is a route path. **Everything after the last `/` is a dot path into the instance's state; everything before it is the route.**

```ts
tree.DiffPath("/channel/0001/metadata.name", "new name");
// route: /channel/0001   dot path: metadata.name
```

- An instance behaves like a root `DiffTree`: its root is an object, and every write targets a key on it. The dot path after the last `/` must be non-empty, so `/channel/0001` and `/channel/0001/` are errors. An instance's root is never replaced.
- A dot path can't contain `/`. A param value can contain `.`.
- A path without a leading `/` is a root path, as today.
- The first write to a route that matches a pattern but has no instance creates it (from the route's definition, with the matched params). Activation is data: it happens by writing.

`DiffPath`, `PatchPath`, `PushPath`, `SplicePath`, `GetPath` and `Snapshot` all accept route paths, and delegate the dot path to the instance's method of the same name.

A route write returns the instance's own result: the diff (or `DiffSpliceResult`) of the instance's state, with paths relative to the instance. Client code will usually discard it, but it's computed anyway and is useful: an empty diff means the write changed nothing. These results never reach the Store. Root diffs, including the route's summary, come only from the root's `RunProjections` (see Run order).

### Where instance state lives

Every tree in a family (the root tree and all instances under it, at any depth) shares one root-state object. An instance's state hangs off it under a non-enumerable symbol property, `ROUTES`, with one level per segment of the instance's base path:

```ts
// "/channel/0001/metadata.name"
root[ROUTES].channel[ROUTES]["0001"].metadata.name
// "/channel/red/large/user/u1/name", for /channel/{color}/{size} with a nested /user/{userId}
root[ROUTES].channel[ROUTES].red[ROUTES].large[ROUTES].user[ROUTES].u1.name
```

- `Object.keys`, `JsonDiff`, `JsonApplyDiff`, flattening, `JSON.stringify` and `CreateSnapshot` never see a symbol key, so instance state never shows up in a root diff, a root snapshot or a Store. The property is also non-enumerable, so spreads don't copy it.
- An instance's state object is created when the instance is, and every write targets a key on it, so it's never replaced and its own `ROUTES` stay attached.
- An instance applies its writes to its own state object, with paths relative to it. That is why a route write's diff is instance-relative.
- The family also keeps a map from base path to tree. Snapshot resolution uses it (see Snapshot state).

### Summaries and the output key

The instance's projection host catches the write of the `ROUTE_SUMMARY` result (`$projection_$summary`) and writes it to the instance's **slot** in the parent instead of its own state. Neither projector changes: both store results through the host's `Write`. Each instance owns one slot under the output key:

```ts
rootState.channel = { "0001": <summary of /channel/0001>, "0002": <summary of /channel/0002> };
```

With several params, the slots nest in param order:

```ts
// "/channel/{color}/{size}"
rootState.channel = { red: { large: <summary of /channel/red/large> } };
```

- A route without params has a single slot: the output key itself.
- The slot path is built as an array, so a param value containing `.` stays one level (`channel["a.b"]`). Missing levels are created by the write.
- The summary isn't stored in the instance, so nothing in the instance can read `$projection_$summary`; a value both need is its own projection, which the summary reads.
- In a tree that isn't a route instance, `$summary` is an ordinary projection id.

**Patterns can't overlap.** The output key is the first fixed segment, so two patterns sharing it would share an output key; they're rejected at construction. That also rules out overlap under the last-`/` rule: `/channel/{id}` and `/channel/{color}/{size}` would both match `/channel/red/large/x` (one fully, one as a prefix delegating `/large/x` to a child route), and the pair is rejected.

**The summary is the only writer of its output key.** Routes are declared at construction, so the parent knows every output key and rejects any other write to one: a root-path `DiffPath`/`PatchPath`/`PushPath`/`SplicePath`, or a projection whose id would collide. At construction it also rejects two patterns with the same first fixed segment, and a first fixed segment starting with `$projection_`. `FlattenValue` rejects a keyed entity whose key equals an output key.

### Keeping the diff small

- **The projector's memo decides when a summary re-runs.** It replaced a dirty set the parent kept per route: an instance's state snapshot stays the same object until something writes into the instance, and a projection's read values compare the same way. A summary with narrower reads re-runs less often than "the instance was written to", e.g. a new message that doesn't change `$projection_unread`.
- **Each summary write is diffed against its own slot only**, so one changed instance never compares the others. The slot holds a clone (`JsonApplyDiff` clones what it applies), so a changed summary is deep-compared against it, like any projection result. An earlier version kept the last aggregate of all summaries to compare by reference; per-slot writes made that unnecessary.
- **The small diff is applied to the parent's state** through `JsonApplyDiff`, which clones only the changed values.

This relies on the summary being the sole writer of its output key.

With a `keyFunc`, a summary's keyed entities are flattened into the parent's root and diffed against the parent's copies, which never match by reference.

**Proposed enhancement: a visit filter.** The parent runs every instance's projector on every `RunProjections`, so each summary's memo is checked even for instances nobody wrote to: O(instances × projections) per run. If instance counts make that matter, a set of instances written since the last run would let the parent skip the rest. It would only skip visits; the memo would still decide whether a summary re-runs. (Also noted at the top of `diffTree.ts`.)

### Run order

The parent's `RunProjections`:

1. For every instance of every route: run its `RunProjections` (its own instances first, then its projector). Its result stays internal; its summary projection writes the instance's slot in the parent, and the parent collects that diff.
2. Run the parent's own projector, which may read output keys like any other root key.

It returns root diffs only: the collected summary diffs, then its projections'. A route write's own result describes the instance, not root state; the root change arrives from `RunProjections`, which `DiffSync` calls after every write and `DiffTreeWriter` calls once per `Commit()`. So a batch's writes, instance projections, summaries and root projections all reach the Store together.

### Deleting an instance

`DeleteRoute(path)` deletes a route instance and every instance nested under it, and removes its slot under the output key. It's on `DiffTree`, `DiffTreeWriter` and `DiffSync` (which returns the next `RunProjections`), and the worker connector accepts a `"deleteroute"` call; `IDiffTree` doesn't change.

- **Path.** It must name exactly one instance: every segment of the pattern and nothing after it. A partial path (`/channel/red` for `/channel/{color}/{size}`), a path into an instance's state, and a path matching no pattern throw. A nested path is resolved through the instances that exist; if one is missing, it returns `false` and creates nothing (the rest of the path is still checked against the nested definitions, so a malformed one throws either way).
- **The instance**, right away: its state leaves its parent's `ROUTES`, along with intermediate levels it leaves empty; it and its nested instances leave `route.instances` and the family's tree map, so a later write builds a fresh instance with a new projector; its state's top-level values are invalidated, so a parent snapshot that resolved one of its entities is rebuilt from the embedded copy.
- **The slot**, right away, collected for the parent's next `RunProjections`. Without params, the output key is set to `undefined`, in the tree and in the Store through the diff. The key stays: both projectors skip a projection whose read is missing and keep its old result, so deleting the key would leave anything reading it (a root projection, or a parent instance's summary) stale. The tree applies `undefined` entries like any other (as a Store does), so when a parent instance's summary picks up a nested route's `undefined` output key, its slot in the tree holds `undefined` too. With params, the slot's key is deleted with the levels it leaves empty, up to the output key, which stays as `{}` at worst. An instance whose summary never wrote a slot produces no diff.
- **Order in a batch** follows from that: delete then write produces a whole new summary against the empty slot; write then delete leaves no slot.
- **Not while projections run.** It throws if any tree in the family is running projections, so instances never change mid-run.
- **No writes into a deleted entity.** A container keeps its embedded copy of a routed entity after the instance is deleted, and reads fall back to it. A write *into* that entity (`channels.0.name`) throws, before anything is created: the embedded copy may be stale, since a keyed entity can be written through many paths, and recreating the instance from it would bring back a version no other path shows. Write the whole entity (`channels.0`, or the array) to recreate it from the value written. Client code shouldn't write into an entity it has deleted.

`RunProjections` takes the collected summary diffs only once the run succeeds, so a removal recorded between runs, or summaries written before a projector throws, reach the Store with the next run.

Costs: a diff has no delete record, so removing a slot replaces the deepest container left (all of `channel` for a single-param route), and finding the instance in `route.instances` is a linear scan. A delete record in `JsonDiff`, and a map of instances by base (which the proposed visit filter would also use), would make both cheap.

### Nesting

Because the route ends at the last `/`, a nested path needs no new syntax. `/channel/0001/thread/5/body` matches the parent's `/channel/{channelId}` prefix, and the parent delegates `/thread/5/body` to that instance, whose own routes handle it. The child's summaries feed the instance's state, not the parent's root.

Nesting should only stay in scope if it needs nothing beyond the definition above.

### Keyed entities routed by `keyFunc`

A `keyFunc` can return a route path. For example, a root write of an array of channels, where `keyFunc` returns `/channel/<id>/metadata` for each one:

```ts
tree.DiffPath("channels", [{ id: "0001", name: "general" }, { id: "0002", name: "random" }]);
// flattened: /channel/0001/metadata and /channel/0002/metadata, each written to its instance
```

**A routed entity lives only in its instance.** It isn't copied into the flattening tree's root state. The container that holds it (`channels`) keeps its embedded copy, as containers of keyed entities do today, and reads resolve the keyed child through the instance.

A route key is **relative to the tree that flattens it**: it's resolved against that tree's own routes. Writing an array to `/users/all`, where the `/users` instance's `keyFunc` returns `/user/<id>/profile`, routes each user to the `/users` instance's child route, `/users/user/<id>`.

A route key matching none of the tree's routes **isn't a key in that tree**: the object is plain data there. This is what lets a route instance share its parent's `keyFunc`. When the root routes a channel's metadata to `/channel/0001`, the instance writes it at `metadata`, and the instance's `keyFunc` returns `/channel/0001/metadata` for it again; the instance has no `/channel` route, so it holds the entity as plain data instead of routing it a second time or rejecting it.

A routed entity's instance owns everything inside it:

- Flattening doesn't descend into a routed entity. The keyed entities it holds are flattened by its instance, against the instance's keys and routes.
- Resolving a write path (`ResolveKeyPath`) stops at the outermost routed entity on the path, rather than the deepest keyed object, and the instance resolves the rest.
- Reads switch to the instance's context when they pass through a routed entity, so keys below it resolve against the instance.

Wherever the tree turns a key into a root object, a route key resolves to `<instance state>[<rootKey>]` instead of `<state>[key]`:

- **Flattening.** `UpdateSource`, `PushSource` and `SpliceSource` write a flattened entity with a route key through the instance (`DiffPath` with the route path, creating the instance on first use) instead of diffing it against `source[key]`. The instance's diff is its own result: it isn't appended to the flattening tree's diff.
- **Path reads.** `ResolveKeyed`/`GetPathValue` resolve a keyed child with a route key through the instance.
- **Writes into an entity.** `ResolveKeyPath` redirects a write such as `channels.0.name` to the key path as today; when the key is a route path, that becomes a route write.
- **Snapshots.** The snapshot resolver returns the instance's raw object for a route key, and moves the snapshot's base path to the instance. See Snapshot state below.

**Summary and projection writes don't route.** When the parent writes a summary to its output key, or a projection's result to `$projection_<id>`, route-keyed entities in it stay embedded and aren't written into instances. Otherwise they would write into instances during `RunProjections`, possibly into ones already summarized in the same run, or back into the summarizing route. Routing happens only on client writes, so instances never change while projections run.

Because a public path starting with `/` is parsed as a route path, nothing in the flattening tree is stored under a route key, and no root diff it returns has a path starting with `/`.

### Snapshot state

Resolving through an instance only stays correct if a write inside the instance invalidates the parent's cached snapshots that embedded the entity. Invalidation climbs `hierarchy` links within one `ISnapshotState`, so with a state per tree the climb stops at the instance's root and the parent's `channels` snapshot goes stale.

The proposed fix: **the root tree and all its instances share one `ISnapshotState`.** Raw objects are never shared between trees (`JsonApplyDiff` clones), so cache entries can't collide, and links recorded while building a parent snapshot that embeds an instance's entity make a write in the instance climb into the parent. Parent projections reading `channels` then re-run when a routed entity changes, as they do for root keyed entities today.

The resolver then has to depend on **which tree owns the object being resolved from**, not on which tree started the snapshot. Plain keys are scoped to their tree, and a routed entity can hold keyed children whose keys are relative to its instance (an instance's plain keys, or a grandchild route). A snapshot is cached once per raw object and reused by every tree, so it must be built the same way whichever tree asks.

**The snapshot state carries a base path.** `ISnapshotState` has a `base` field: the base path of the tree keyed children currently resolve against. The family's one resolver looks up the tree at `base` and resolves the child's key against it:

- A plain key resolves to that tree's state object at the key.
- A route key resolves through the matched instance, and the resolver sets `base` to the instance's base path, so keys below the entity resolve against the instance.
- `ChildSnapshot` saves `base` before calling the resolver and restores it once the child's snapshot is built, so a sibling after a routed entity resolves against the tree it belongs to again.
- A tree starting a snapshot (`DiffTree.Snapshot`, the projection host's `Snapshot`, a summary) sets `base` to its own base path first and restores it after.

`SnapshotResolver` keeps its `(child) => object | undefined` signature. `ObservableNode` doesn't use `base`, so its behaviour is unchanged.

An earlier version made the resolver return the resolver to continue with along with the object. It was replaced by the base path, which keeps the resolver signature and leaves the save/restore as the only special case in `snapshot.ts`.

Two knock-on changes:

- `IDiffTreeProjectionHost` replaces `snapshotState` with a `Snapshot(value)` method that sets the tree's base path, and the projectors use it.
- `GetPathValue` walking a path through a routed entity makes the same switch: `ResolveKeyed` returns the owning tree along with the object, and the walk continues resolving keys against that tree.

### What reaches the Store

The root array holding a routed entity reaches the Store with its embedded copy. `ReadStore`'s alias resolves a keyed child through `rootMap` and throws when the key isn't a Store root, so it must skip keys starting with `/` and read the embedded copy. That copy changes in the Store only when the array is written; the entity's later changes reach the Store through the route's summary.

Nothing in root state is stored under a route key, so the plain filter over diff output (drop entries whose first segment starts with `/`) is now only a safeguard.

## Dependencies on existing code

- **Constructors.** `DiffTree(keyFunc?, projector?)` takes a third `routes` argument, and `IDiffTreeConstructor`, `DiffSync` and `DiffTreeWriter` pass it through. An options object may age better than a third positional argument. Two more arguments, the parent and the base path, are internal: only a parent passes them when it creates an instance.
- **Forwarding results.** `DiffSync` returns a write's result to `StoreSync`, `DiffTreeWriter` records it for `Commit()`, and `ConnectWorkerToDiffTree` posts it, and each of them is applied by root path. A route write's result has instance-relative paths, so all three forward only the root's `RunProjections` result for a route write, never the write's own result. `ConnectWorkerToDiffTree` answers a route write with an empty diff entry. `DiffSync.SplicePath` rejects a route path, since its result is a splice the store applies by root path.
- **Store writes.** Route paths are for code holding the `DiffTree` (the worker side, or `DiffSync`). `StoreSync`/`StoreAsync` writes by root key; whether they accept route paths is out of scope.
- **Snapshots.** The root tree creates one `ISnapshotState`, shared by every instance (see Snapshot state). It gains a `base` field, which `ChildSnapshot` restores after each child, so resolution follows the owner of the object being resolved. `IDiffTreeProjectionHost` snapshots from its own tree's base path. A summary projection's reads are snapshots that stay the same object until that instance (or an entity routed into it) is written. Snapshots aren't frozen, so a projection must treat them as read-only. Returning parts of them is safe, since the parent's apply clones them.
- **The Store's alias.** `ReadStore` skips keys starting with `/` and reads the embedded copy instead of throwing.

## Open questions

- **Reading parent state from an instance (deferred).** An instance can read only its own state. With nesting in scope, how a reference correctly points at a parent (the root, or an intermediate instance) is undecided. Whatever form it takes, reading parent state makes an instance depend on the parent, so it must be re-run when those keys change, and the parent needs a cycle check by pattern: a route can't read a key its own output feeds.

## Tests

- A route path write creates an instance on first use; a second write to the same route reuses it.
- Instance state lives in the root state under the `ROUTES` symbol, one level per segment, and doesn't appear in the root's keys or its JSON.
- A pattern with several params creates one instance per distinct route config, with every param by name in the config, and its summaries nest in param order under the output key (`channel.red.large`).
- Two patterns with the same first fixed segment (including `/channel/{id}` with `/channel/{color}/{size}`), a pattern starting with a param, and a first fixed segment starting with `$projection_` are rejected at construction.
- `/channel/0001`, `/channel/0001/` and a path matching no pattern are rejected without creating an instance.
- A route write returns the instance's diff, with instance-relative paths; a write that changes nothing returns `[]`.
- A write to one instance produces root diffs from `RunProjections` only under `channel.0001`, and none for other instances.
- A write that doesn't change a summary's reads doesn't re-run the summary and produces no root diff; a summary re-runs only when its reads change.
- A route without a summary projection writes nothing to the parent.
- A param value containing `.` is one level under the output key.
- In a tree that isn't a route instance, the summary id is an ordinary projection.
- A root write of an array whose `keyFunc` returns route keys creates or updates those instances; the same through `PushPath` and `SplicePath`. Nothing is stored in root state under a route key, and the write's diff contains no instance paths. A Store receiving the root array reads the embedded copies without throwing.
- Reading `channels.0.name` resolves through the instance; a write to it is a route write.
- A direct route write to a routed entity (`/channel/0001/metadata.name`) invalidates the parent's cached snapshot of `channels`, and a root projection reading `channels` re-runs.
- A route key is resolved against the flattening tree's own routes: writing to `/users/all` routes `/user/<id>/profile` keys to `/users/user/<id>`. A route key matching none of them is plain data in that tree.
- A summary containing a route-keyed entity is written with the entity embedded; no instance is created or changed.
- A routed entity holding a grandchild-routed entity snapshots the same whichever tree's snapshot reaches it first.
- An instance's plain key resolves in the instance, and a root entity with the same key resolves in the root, including in one snapshot of a root array holding both (the base path is restored after the routed entity).
- With a summary returning a subtree of the instance's state, a change to one field produces one diff entry at that field's path under the output key.
- A root write, or a projection id, targeting an output key is rejected.
- Instance projections run before the summary; root projections reading the output key see the new summary in the same run.
- `DiffTreeWriter` and `DiffSync`: a route write's own result is never forwarded to the Store; its summary reaches the Store from `RunProjections`, in the same `Commit()` message as the batch's root writes.
- `GetPath`, `Snapshot` and `PatchPath` on a route path read the instance's state.
- `DeleteRoute`: projections reading a deleted route without params' output key (sequential, tracked, and a parent instance's summary) re-run with `undefined`, and the tree and a Store stay in step through deleting and recreating a nested one; a write into a routed entity whose instance was deleted throws and creates nothing, while writing the whole entity recreates it; removes the instance, its nested instances and its slot (pruning empty levels; the output key stays `{}`, or becomes `undefined` without params); rejects partial, dot and unmatched paths; returns `false` for a missing instance; delete-then-write and write-then-delete in one batch; summaries survive a projector throw; root projections reading the output key re-run; embedding snapshots fall back to the embedded copy; throws during `RunProjections`; `DiffSync` and `DiffTreeWriter` forward the removal.
