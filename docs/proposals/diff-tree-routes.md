# Proposal: Routes in a DiffTree

Status: built, in a simpler form than first proposed (updated 2026-11-15). Routes shipped with the 9.0
rework and are in `src/Store/Diff/utils/` (`routes.ts`, `state.ts`, `projections.ts`), tested in
`test/diffTree/diffTree-test.ts` ("route instances", "route keyFunc", "home route keying", "delete route",
"unchanged routes"). The first design wasn't built; "What changed from the first design" sums it up, and
its full text is in git history (`git show 73bed29:docs/proposals/diff-tree-routes.md`).

## What a route is

A route is a slice of a `DiffTree`'s state, addressed by a path such as `/channel/1/`, with projections
of its own. The tree takes the route definitions by pattern:

```ts
const tree = new ObservableDiffTree({
  keyFunc,
  routes: {
    "/": { projections: { unread: { reads: ["channel/*/$projection_unread"], projection: sumOf } } },
    "/channel/{id}": {
      projections: { unread: { reads: ["messages"], projection: countUnread } },
      keyFunc: (data) => data?.cid,
      routes: { "/user/{userId}": { projections: {} } },
    },
  },
});
tree.WritePath("/channel/1/messages", [...]);
```

- **A route path is the route, then a property path.** Everything after the last `/` is a dot path into
  the route's state: `/channel/1/metadata.name`. A path without a leading `/` is in the root route. A
  write needs a property path: `/channel/1/` alone throws.
- **An instance is created by the first write** that matches its pattern, and reused. A write whose
  path matches no definition still lands in the state (`/unknown/1/name` reads back), with no instance
  and so no projections.
- **One root state.** A route's state hangs off its parent route's state under the `ROUTE_STATE` symbol,
  keyed by segment (`RouteState`, `state.ts`), so `Object.keys`, diffs and snapshots of a route's state
  never see its child routes. `Commit` diffs the root route's keys, so route state reaches subscribers
  only through what the root route's projections make of it.
- **Projections read relative to their route, or from the root** with a leading `/`. One route segment
  may end in `*` to read every matching instance (`child/row_*/name`), passed as an object keyed by the
  matched segment. A projection's output is `$projection_<key>` in its route, read-only to writes. Keyed
  projections (`read`, one record mapped by key) and promoted keys (a projection's `keyFunc`) work in any
  route.
- **Each route may have its own `keyFunc`**; a route without one uses its nearest defined parent's, and
  the tree's is the root's default. A keyed value's home is in the route it's written in, and a keyFunc
  may key it into a child route (`sub/<id>`), where that route's keyFunc applies to its children.
- **Follow routes** (`follow: true`) hold another tree's roots, written only by `ApplyDiff` from a
  subscription; an endpoint's `FollowRoute` declares them.
- **`DeleteRoute(path)`** deletes a route instance, its state, its child routes and their projection
  outputs. A wildcard read drops it, snapshots that read through it are invalidated, and the projection
  order is rebuilt on the next run.

## What changed from the first design

The first design made each route instance a `DiffTree` of its own, with a projector per instance and a
reserved summary projection (`ROUTE_SUMMARY`, `$summary`) as its only way out: the summary was written to
a slot under an output key in the parent's root state (`channel.0001`). It also routed keyed entities into
instances by route keys, gave the family one snapshot state with a moving base path, and had the Store's
alias skip `/` keys.

What was built instead:

- **One tree, route state under a symbol, and projections per route**, not nested trees. There is no
  summary and no output key: a parent reads what it needs from its children with a wildcard read, in a
  projection of its own.
- **Reading parent state**, the first design's open question, is a read with a leading `/`.
- **Removing a route's slot** needed a delete record; `JsonDiff` has one now (`delete`), and `DeleteRoot`
  removes a root key.
- **The visit filter** the first design proposed (skip instances nobody wrote to) is how projections run
  now: a projection whose sources all still have the snapshots it read is skipped without a read
  (`SourcesUnchanged`, "unchanged routes").

## Open

- **A flat route map** in place of the `IRoute` tree and the `ROUTE_STATE`-nested state
  (`NEXT_STEPS.md`, "Flat route map").
- **A route segment named like an `Object.prototype` member** (`constructor`) resolves to that member in
  `RouteState` (`docs/bugs/diff-tree-8.2-regressions.md`, "Open").
