# Hub Endpoints

## Overview

An app that moves its data off the main thread ends up with several trees: one per worker, and some on the main thread. Each one may follow others. `DiffTreeHub` runs them, and `HubEndpoint` describes each one once, as plain data, so the hub's registration, the tree's routes, its hosting and the stores opened on it all come from one definition.

The API reference is in the [Syntax Primer](../SYNTAX_PRIMER.md) ("DiffTreeHub: trees by endpoint"). This page is the model behind it.

## The model

- **An endpoint is a key in the hub, and one tree in the dependency graph.** `HubEndpoint.Define(name, build, { keyFunc, opaque })` describes it: its name, the endpoints it follows, how its data is keyed, and which keys are held whole. `remote(source, roots)`, given to `build`, records what it follows and returns the paths the tree reads them at (`/<source>/<root>`).
- **The tree runs in a worker or on the current thread, and the hub manages both the same way.** The factory given to `Register(endpoint, factory)` returns a worker, or the `ObservableDiffTree` itself. The hub tells which from what it returned, and wires it up to match. Either way it starts the tree on the first lease, holds leases on its sources while it runs, gives it a port to each (again when a source restarts), serves it to the trees that follow it, and ends it with the last lease.
- **Every tree is hosted by the same call.** `HubEndpoint.Host(endpoint, tree, scope)` marks the endpoint's `opaque` keys on the tree, serves it (`HostPublisher`), and follows its sources into it (`HubEndpoint.Connect`). A worker entry calls it on `self`; the hub calls it for a tree on the main thread, on a channel it creates. A tree file only builds the tree.
- **Stores attach to a tree by lease, any number to one tree.** `Open` leases a worker's tree, as a port, for a `StoreAsync`. `OpenLocal` leases a tree on this thread, as the tree itself, for a `StoreSync`. The leases are different types, so a store given the wrong one doesn't compile, and each throws for a key of the other kind. Each store owns its lease and releases it on `Destroy()`.
- **Fail loudly.** A key opened as the wrong kind, a factory that returns neither kind, or one that changes kind on a restart, is configuration to fix. Nothing tries to recover from it.
- **The tree is the source of truth.** A tree that fails isn't recovered. `Restart` is the app choosing to start a tree over: the hub creates it again from its factory, and every store on it starts over with it, as when it first subscribed. Its state is applied in place, so readers keep their objects, and the roots it no longer holds are deleted. Nothing a store wrote is written back, and changes the old tree hadn't acknowledged reject.
- **State that must outlive a restart goes in its own tree.** Make it an endpoint of its own (often a tree on the main thread, with a `StoreSync` writing it), and have the restarted tree follow it. Following resumes by itself, and the restarted tree recomputes from it.
- **`opaque` is local.** It means "never diff this path", for whoever holds the key. It's configured on the definition and never travels: `Host` marks the tree, and each store holds the same keys whole. A store's own `opaque` replaces the endpoint's for that store alone; a store may hold fewer keys whole than its tree.

## Wiring one up

```typescript
// ledger-endpoint.ts, totals-endpoint.ts, budget-endpoint.ts: imported everywhere
export const ledgerEndpoint = HubEndpoint.Define("ledger");
export const totalsEndpoint = HubEndpoint.Define("totals", remote => ({
  ledger: remote(ledgerEndpoint, ["entries"]),            // { entries: "/ledger/entries" }
}));
export const budgetEndpoint = HubEndpoint.Define("budget", remote => ({
  ledger: remote(ledgerEndpoint, ["$projection_summary"]),
}));

// totals-tree.ts: only builds the tree
export function newTotalsTree() {
  return new ObservableDiffTree(totalsEndpoint.keyFunc, {
    "/": { projections: { totals: { reads: [totalsEndpoint.config.ledger.entries], projection: categoryTotals } } },
    ...HubEndpoint.FollowRoutes(totalsEndpoint),
  });
}

// totals-worker.ts
HubEndpoint.Host(totalsEndpoint, newTotalsTree(), self as any);

// main.ts: sources first
const hub = new DiffTreeHub();
hub.Register(ledgerEndpoint, () => new Worker(new URL("./ledger-worker.ts", import.meta.url), { type: "module" }));
hub.Register(totalsEndpoint, () => new Worker(new URL("./totals-worker.ts", import.meta.url), { type: "module" }));
hub.Register(budgetEndpoint, newBudgetTree);              // on the main thread
injector.Set(DiffTreeHub, hub);

// components: a store per component, released with it
@Inject(DiffTreeHub) hub!: DiffTreeHub;
@Destroy() totals = new StoreAsync(this.hub.Open("totals"));
@Destroy() budget = new StoreSync(this.hub.OpenLocal("budget"));
```

- Keep each worker's factory a literal `new Worker(new URL(...), { type: "module" })` at registration, not in the definition: the worker imports the definition, and bundlers compile only that form into a worker bundle.
- Import the definitions and `HubEndpoint` with deep imports (`j-templates/Store/Diff/hubEndpoint`), or from `j-templates/Store/Diff`, never from `j-templates/Store`, which reads `window`.
- A tree that acts on what it follows later than each post (at the end of the turn, say) passes `onFollow` to `Host`, and commits there itself.
- A store's writes go to its tree. A `StoreSync`'s change commits the shared tree, which reaches every store on it and the trees that follow it before it returns.
- `instanceof ObservableDiffTree` decides a tree. An app that loads two copies of j-templates' modules (a bundler pre-bundling the deep imports apart from the barrel, say) gets "neither a worker nor an ObservableDiffTree": load one copy.
