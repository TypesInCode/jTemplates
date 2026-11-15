# Proposal: DiffTree pushes its commits

Status: phases 1–4 implemented (the tree's commit state, `SubscriptionManager`, `DiffTreePublisher`, `StoreSync` over it; `HostPublisher`, `StoreAsync` over posts and acks, `Subscribe` and `Once` over a channel; `WorkerHub`, leases, `OnConnect`, `Reconnect`; builder-app's three worker stores on them, measured: §Phase 4: builder-app). Open after the measurements: how the run's index crosses to the trace worker (§Phase 4 findings, 1), and `IsPending(root)`.

> **Superseded in part (2026-11-13):** the hub is now registered by endpoint (`DiffTreeEndpoint.Define`), a
> key's factory may return a tree to run on the main thread, stores own their leases, and a restart no
> longer reseeds: the tree is the source of truth. The sections on the hub, reseeding and restarts below
> describe the earlier design. See [DiffTree Endpoints](../patterns/05-difftree-endpoints.md).
>
> `DiffTreePublisher` is now `ObservableDiffTree` (`Store/Diff/observableDiffTree`), and it extends `DiffTree`
> instead of wrapping one.
>
> `WorkerHub` is now `DiffTreeHub` (`Store/Diff/diffTreeHub`): it runs trees on the main thread too.

## Summary

A `DiffTree` posts every `Commit()` to whoever subscribes to it. A store is one subscriber: it sends batches of writes to the tree and applies the tree's posts, whatever caused them. The tree no longer answers a batch with its reply; it runs its projections, commits, and the post that follows says which batch it covers. `Flush()` and each write's promise wait for that post.

`RunProjections()` and `Commit()` stay separate steps. A store's batch always runs both. Code that writes to the tree directly decides: it can commit a small change at once (a flag saying a large write is in flight) without recomputing projections, and run them when its work is done.

Subscriptions live outside the tree, in two layers: a use-case agnostic subscription manager (keys, wildcards, groups, counts, release), and a DiffTree publisher that owns its tree, is the only way to commit it, and uses only the tree's public API. The publisher shapes each commit for each subscriber, as diff records for a store or as whole changed roots for another tree, filtered by root key. The same commit reaches every subscriber, on the same thread or across workers. A hub on the main thread owns the workers: it creates each one from a factory when it's first needed, hands out channels to it as leases, connects workers to each other, re-creates a worker on request and re-issues every channel to it, and terminates it when its last lease ends. One worker can subscribe to a tree in another, and a derived worker lives as long as the components that use it. A version of some data, such as one engine run, is a root key, and a consumer names the version it wants in its filter.

This replaces `PushStore`, `DiffTreeWriter`, `WorkerQueue` and `ConnectWorkerToDiffTree` with one model, and removes the workarounds every worker store in builder-app repeats (§7).

## Motivation

Today there are two ways a tree's changes reach a store, and neither covers the common case.

- **`StoreAsync` + `ConnectWorkerToDiffTree`: request and reply.** `WorkerQueue` pairs each message from the worker with the oldest batch in flight. A worker that writes on its own (a build finished, data arrived) can't commit, because its post would be taken as a batch's reply. builder-app's trace worker posts a `pending` note on a second port instead, and the main thread answers with a write to a `tick` root, whose reply carries the worker's changes: an extra round trip, a dedicated root, a notes port, a `write()`/`note()` discipline in the tree and a `committed()` call after every batch.
- **`DiffTreeWriter` + `PushStore`: push only.** The worker commits when it likes, but the store can't write, and a store created after the first commit misses everything before it.
- **The channel belongs to the store.** `WorkerQueue` sets the worker's `onmessage`, so any other message on that channel must be split off first. builder-app's `trace-host.ts` routes control messages around `ConnectWorkerToDiffTree` for this reason.
- **Worker-to-worker channels are the app's.** builder-app's `EngineClient.connect` makes a `MessageChannel` per consumer, sends the engine worker its end in a `connect` message, hands the consumer the other, and does it again after a restart. The trace service passes its port on with a control message. Every new derived view repeats this.
- **One failed batch stops the store.** `AsyncQueue` rejects every later batch after a failure, so a single throw takes a view down for good.

`heavy-derived-data-pattern.md` in builder-app lists these as F1 (unsolicited commits), F2 (batch failure isolation), F3 (a store that outlives its worker) and F6 (pending state). Push with acknowledgements gives F1 directly, and makes F2, F3 and F6 small.

## Design

### Commit is a post

```ts
const tree = new DiffTreePublisher(keyFunc, routes);   // owns its DiffTree
const stop = tree.Subscribe({ roots: ["loading", "$projection_*"], form: "diff" }, post => { /* post.diff, post.seq */ });

tree.WritePath("loading", true);
tree.Commit();            // posted now: the store sees the flag while the work below runs

tree.WritePath("results", computeResults());
tree.WritePath("loading", false);
tree.RunProjections();    // projections that read results rerun
tree.Commit();            // diffs since the last commit, posts to every subscriber
```

- **`Commit()` diffs, and the publisher posts; it doesn't run projections.** `RunProjections()` is its own step, as today. A store's batch always runs both (below). Code writing to the tree directly runs projections when the change needs them.
- **A commit without `RunProjections()` can post roots ahead of the projections that read them.** Subscribers get the new roots and the projection outputs from before, until the next `RunProjections()` and `Commit()`. That is the point of committing a flag early; anything that must be consistent runs projections first.
- **`Commit()` posts synchronously.** A commit made before a long synchronous write is delivered to the main thread while the write runs, and the write's own commit follows it in order.
- **One diff per commit, shaped per subscriber.** It's computed once, against the committed snapshots, as today; the publisher filters and shapes it for each subscriber (§Subscriptions outside the tree). A commit with no changes posts nothing; a batch it answers still gets its `jt-ack` (below).
- **A post is numbered.** `seq` increases per commit. On one channel posts arrive in order (a `MessagePort` is FIFO); `seq` lets a subscriber that reconnects tell what it missed.
- **`DiffTreeWriter` goes.** It made `RunProjections()` throw so a push never carried part of a batch; with separate steps the code that writes decides. Its error handling (a failed change makes later changes throw until the commit, which posts what was applied plus the error) becomes the host's batch handling (§Failure).

### Subscriptions outside the tree

The tree knows nothing about subscriptions. Two layers above it do, each knowing only the one below.

**A subscription manager, for any use.** It deals in keys, subscriptions and groups, and nothing about diffs or payloads:

```ts
const subs = new SubscriptionManager<Sub>();
const id = subs.Subscribe(keys, sub, { group });   // exact keys and wildcards
subs.Unsubscribe(id);
subs.Disconnect(group);                            // every subscription in a group (to the host, a channel)
subs.Matching(changedKeys);                        // each subscription, with the changed keys it matches
subs.MatchingKeys(id, keys);                       // the keys one subscription matches (its first state)
subs.OnReleased(pattern, key => { /* a key's last exact subscription ended */ });
subs.SubscriberCount(key);                         // the exact subscriptions holding a key now
```

Counting exact keys and reporting their release is generic (§Releasing keys), and so are groups.

**A DiffTree publisher that owns its tree.** It creates its `DiffTree` from `keyFunc` and `routes`, exposes the tree's write API (`WritePath`, `PatchPath`, `PushPath`, `SplicePath`, `DeleteRoot`, `DeleteRoute`, `RunProjections`) and `Commit()`, and never the tree itself, so no code can commit the tree past it. Its `Commit()` calls the tree's, takes the changed and deleted keys from the diff, asks the manager which subscriptions match, and delivers each in its form. It reaches the tree only through public methods that aren't about subscriptions:

```ts
tree.Commit(): JsonDiffResult        // exists: the changes since the last commit
tree.Committed(key): unknown          // new: a root's value as last committed (its cached snapshot)
tree.CommittedKeys(): string[]        // new: the committed root keys, which filters and wildcards match
tree.DeleteRoot(key)                  // new: removes a root; the next commit carries the delete
```

- **The first state is the committed state.** Inside `Subscribe`, the publisher sends `Committed(key)` for each matching key in `CommittedKeys()`; later commits follow. A first delivery that throws ends the subscription. The current state (`Snapshot`) won't do: it holds uncommitted writes, which the next commit's diff would apply a second time, and a positional splice applied twice corrupts an array.
- **Which roots changed comes from the diff.** Every record's first path segment is its root key: the changed keys are the distinct `path[0]`, and the deleted ones are `delete` records at `[key]`. After the commit, `Committed(key)` is each changed root's whole new value, shared and never mutated, so reading it costs nothing.
- **Each subscription names its form.** `"diff"` gets the commit's records whose root matches its filter (a store, which applies them to its nodes). `"snapshot"` gets `{ roots: { [key]: Committed(key) }, deleted }` for the matching changed roots (another tree, which writes them: §A worker subscribing to another tree). The first state takes the same two forms: a `write` record per matching key, or the map of every matching key. Both come from one commit; nothing is diffed twice.
- **Subscriptions have ids.** One channel can carry several (a long-lived one and a `Once`), and every delivery names the subscription it's for.
- **The tree-specific parts are the publisher's:** the first state, `seq`, the two forms, and `Once`, which needs to know what "present" means for a key.

### Versions are keys

A version of some data (an engine run, a what-if's result) is a root key of its own, and a consumer names the version it wants in its filter.

```ts
// engine worker: the current run's parts and its revision, and each detached run under its own key
tree.WritePath(`whatif_${revision}`, index);
tree.Commit();

// trace worker
Subscribe(port, { roots: ["revision"], form: "snapshot" }, update => { /* staleness: compare revisions */ });
const current = await Once(port, ["index", "revision"]);                // load the current run
const whatIf = await Once(port, [`whatif_${revision}`], { signal });    // a what-if's result
```

- **`Once(port, keys)` resolves on the first update in which every named key is present**, then unsubscribes. When the keys exist, that's the first update; when a key is written later (a what-if finishing), it's the update that adds it. Either order works, so the consumer no longer keeps "the last two detached indexes and the last ask" to make them meet. `Once` takes exact keys, not wildcards, since "every key present" means nothing for `task_*`.
- **The result is one revision.** An update comes from one commit, so `Once(port, ["index", "revision"])` gives an index and the revision it belongs to.
- **A version that's gone never arrives.** "Not yet" and "gone" look the same in an update without the key; the consumer tells them apart from `revision` (the source is past the version and the key is missing) and cancels the `Once` with its `AbortSignal`.
- **A pull is a subscription that ends.** The trace worker follows only `revision`, and takes the index with `Once` when it loads a run, so it holds a copy of a run only while it draws one.

### Releasing keys

The subscription manager counts, for each exact key, the subscriptions that name it. It reports when a key loses its last one, and answers how many hold a key now. When a key is removed, and whether it is at all, is the app's: the framework has no cap, timer or grace period.

```ts
// engine worker: drop a detached run nobody took within a minute, or a minute after its release
const expire = (key: string) => setTimeout(() => {
  if (tree.SubscriberCount(key) === 0) {
    tree.DeleteRoot(key);
    tree.Commit();
  }
}, 60_000);

tree.WritePath(`whatif_${revision}`, index);
tree.Commit();
expire(`whatif_${revision}`);
tree.OnReleased("whatif_*", expire);   // the publisher passes both to its manager
```

- **Only exact keys hold a key.** A wildcard subscription receives matching keys but doesn't keep them, or a `whatif_*` subscriber would keep every detached run.
- **`OnReleased` is opt-in, by pattern**, and only reports. Most roots (`index`, `revision`) stay with no subscriber at all; what a release means is the app's callback.
- **It fires when the count falls to zero, not while it's zero.** A detached run's key is written before its consumer subscribes (the engine writes `whatif_14`, the main thread hears, then tells the trace worker), so "no subscribers" is normal until then.
- **A key nobody ever subscribes to is the app's to expire**, with a timer of its own: it's never released. `SubscriberCount(key)` lets the timer check, when it fires, that nobody took the key meanwhile.
- **A closed channel drops its subscriptions**, which can release keys. A `MessagePort` has no dependable close event, so the source can't see it; the hub can, and sends the source's host `jt-disconnect` when it replaces or ends a connection. A consumer restarted in the middle of a what-if loses that run if the app's callback deletes it at once; delaying the delete, as above, keeps it.

### Batches and acknowledgements

A store sends batches as it does now, each with an id. The host applies a batch, runs projections, commits, then sends `jt-ack` with the batch's id on that channel. `Commit()` delivers synchronously and a channel is FIFO, so the ack always arrives after the commit's posts. Posts carry nothing about batches, and a channel that writes without subscribing still gets its acks. Projections rerun for everything written since they last ran, so the acknowledged commit also brings them up to date for the worker's own uncommitted writes.

```ts
// on a channel
{ type: "jt-batch", id: 7, calls: [{ method: "writepath", arguments: ["query", "a"] }] }
{ type: "jt-post", sub: 1, seq: 41, diff: [...] }        // the worker's own work, committed first
{ type: "jt-post", sub: 1, seq: 42, diff: [...] }        // batch 7 and anything since seq 41
{ type: "jt-ack", id: 7 }                                 // after the commit's posts
```

- **The store applies every post in arrival order**, acknowledged or not. Its state is always a prefix of the tree's commits.
- **A write's promise and `Flush()` wait for an ack (`jt-ack`), not for the next post.** "Wait once for the next post" isn't enough: the worker can commit its own work after the batch is sent but before the batch is applied, so the next post may not include the batch. `Flush()` resolves when a post acknowledges the last batch sent before it was called, and at once when none is in flight.
- **A batch that changes nothing is still acknowledged.** Its commit posts nothing, and the `jt-ack` resolves its promise.
- **Batching stays as it is.** Writes made in one tick form one batch, and at most one batch waits behind the one in flight (builder-app's §3.10 "no debounce" depends on this).

### Failure

- **A failed batch rejects only itself.** The host catches a change's error, skips the batch's projections, commits what the batch applied before it, and sends `{ type: "jt-ack", id, error }`. The store rejects that batch's promises; later batches carry on, and the next one's projections catch up. This is F2.
- **A projection that throws during a batch** fails that batch the same way: the host commits the changes and sends the error with the ack.
- **Errors in the worker's own work are the worker's.** A change or `RunProjections()` call outside a batch throws to the code that made it, which decides whether to commit what it had. The tree never posts an error unasked, so a store's reactive `Error` reflects acknowledged batches only.
- **A projection that throws on every run** fails every batch. Projections still guard themselves (builder-app's `guarded`) when a view should show its error instead.

### Subscribing, and the first state

- **A new subscriber gets the committed state first**: one `write` per committed root key, then every later post. A store created after the tree has committed no longer misses anything (today's `PushStore` caveat), and a store can subscribe again to a replaced tree (below).
- **The first post is the committed state, not the uncommitted one.** Uncommitted writes arrive with the next commit, like everyone else's.
- **The first post isn't marked.** It has the same shape as any other, and a subscriber applies it the same way: one handler serves every post. When no committed root matches, nothing is sent. A subscriber that holds roots from an earlier subscription clears them when it subscribes again; it's the one subscribing, so it knows when.
- **A subscriber names the roots it receives**, as an array of root keys given when it subscribes (`roots`). An entry may be a root wildcard (`"task_*"`), as in projection reads. Omitted, it receives every root. Every diff record's first path segment is its root key, so this is a filter over the shared diff, not a second diff. The committed state sent first is filtered the same way.
- **The filter is how a derivation worker limits what it takes from a source tree.** A trace worker subscribed to the engine's tree names the roots its projections read and receives nothing else. On the main thread it covers F5 (root projections no subscriber reads, such as builder-app's `entityBuilt`). Data that should never leave the tree already has a place: routes are never posted.
- **To change its roots, a subscriber subscribes again** and gets the committed state of the new set.
- **A filter covers the entities its roots refer to.** With a `keyFunc`, entities live under their own root keys and other roots refer to them by key, so a filter naming `"list"` must also match the entity keys its records point to, usually with a wildcard over the `keyFunc`'s prefix. A store that receives a reference to a root it was never sent throws when the reference is read.

### Same thread: `StoreSync`

`StoreSync` owns a `DiffTreePublisher` and subscribes to it in the `"diff"` form. It keeps its behaviour: `Write` is a batch of one, so it applies, runs projections, commits, and the post is applied before `Write` returns. Anything else on the thread subscribes to the same publisher, `store.Publisher`, and a commit made on it directly reaches the store.

A listener that writes to the tree from inside a delivery would re-enter `Commit()`. It throws, as the emitter does today on re-entry (open question 8).

### Same thread: one tree subscribing to another

Two trees on one thread connect through the source's publisher directly, with no channel:

```ts
const source = new DiffTreePublisher(keyFunc, sourceRoutes);
const derived = new DiffTreePublisher(keyFunc, derivedRoutes);

derived.DeleteRoute("/source/");   // whatever an earlier subscription left
source.Subscribe({ roots: ["index", "task_*"], form: "snapshot" }, update => {
  for (const key in update.roots) derived.WritePath(`/source/${key}`, update.roots[key]);
  for (const key of update.deleted) derived.WritePath(`/source/${key}`, undefined);
  derived.RunProjections();
  derived.Commit();          // delivered to derived's own subscribers, still inside source.Commit()
});

const run = await source.Once(["index", "revision"]);
```

- **Delivery is synchronous.** A subscriber's callback runs inside the source's `Commit()`, before it returns, so a change passes through a chain of trees in one call stack. The first state is delivered inside `Subscribe`.
- **Writing to another tree during a delivery is allowed; re-entering the delivering one isn't.** Open question 8's rule is about the tree that is delivering: if `source` delivers to `derived`, and `derived`'s commit delivers to a subscriber that writes to `source`, that write throws. A cycle on one thread fails loudly instead of looping.
- **Values are shared, not cloned.** With no `postMessage` between them, the `"snapshot"` form hands over the source's committed snapshots themselves. `WritePath` copies what it's given into the subscriber's tree, so writing them in is safe; a subscriber that keeps them treats them as read-only, as it would a snapshot or an opaque value.
- **The same code works across a channel.** Only how the subscription is made changes: `source.Subscribe(...)` here, `Subscribe(port, ...)` in a worker. The update and what the callback does with it are the same, so a derived tree can move between the main thread and a worker without rewriting it.
- **`Once` is a promise here too**, resolved from inside the delivery that makes its keys present.

### Across threads: the host

```ts
// worker entry
const tree = new DiffTreePublisher(keyFunc, routes);
HostPublisher(tree, self);           // serves the channel it was created with, and every port given to it

// the worker's own work, between batches
tree.WritePath("/ids/flow", id);
tree.RunProjections();              // the views that read the flow
tree.Commit();                      // posted to every subscriber, with no round trip
```

`HostPublisher` replaces `ConnectWorkerToDiffTree`. It serves a `DiffTreePublisher`, and maps each channel's messages onto it. For each channel (the worker's own, and each `MessagePort` it's given):

- **It serves `jt-` messages and leaves the rest alone.** It listens with `addEventListener`, never by taking `onmessage`, so the app's own messages share the channel without a router (builder-app's `trace-host.ts` and `isTraceControl` split go away).
- **`jt-batch`**: apply the calls, run projections, commit, then `jt-ack` on that channel.
- **`jt-subscribe` / `jt-unsubscribe`**: a subscription by id, with its roots and form, grouped by the channel: the committed state first, then every commit, shaped for it. Or its end. Once the first state is posted (nothing, when no root matches), the host sends `jt-subscribed` with the id, and the error when subscribing failed.
- **`jt-disconnect`**: from the hub, when the channel is replaced or ended: `Disconnect(channel)` ends every subscription on it.
- **`jt-markopaque`**: the existing opaque keys, sent ahead of the store's subscription. (Removed since: a
  tree takes its opaque keys from its config, and a store never marks a tree.)

`HostPublisher(publisher, self)` returns the host; `host.Serve(port)` serves another channel and returns a function that stops serving it, and `host.Stop()` stops them all. A subscription's id is chosen by the client, unique across clients, so several clients share one channel.

A channel can write, subscribe, or both. Several channels may write to one tree; each gets its own acks, and the app keeps one writer per key (builder-app's invariant 5).

### The store over a channel

```ts
const store = new StoreAsync(worker, keyFunc, { opaque, roots });   // writes and reads, as today
const results = new StoreAsync(port, keyFunc);                      // reads only: no writes made
```

- **`StoreAsync` takes a channel** (a `Worker` or `MessagePort`), subscribes on construction, and applies every post. With no writes it's a read-only store, so `PushStore` goes.
- **`WorkerQueue` goes.** Nothing pairs messages with batches; acks name them.
- **`Destroy()`** unsubscribes and stops listening. It never terminates the `Worker`: the store doesn't know who else uses it. A worker's lifetime is the hub's, by its leases (open question 7).
- **A store over a lease** (`new StoreAsync(lease, keyFunc)`) follows the lease's port: when the hub restarts the worker, the store reconnects to the new port, reseeding what it wrote (§A store that outlives its tree).

### Connecting workers: the hub

On the main thread, a hub owns the workers. It knows each one by name and creates it from a factory, hands out channels to it, connects workers to each other, and ends each one when nothing uses it:

```ts
const hub = new WorkerHub();
hub.Register("engine", () => {
  const worker = new Worker(new URL("./engine-worker.ts", import.meta.url), { type: "module" });
  worker.postMessage({ type: "load", project });   // the worker's starting intent, sent on every start
  return worker;
});
hub.Register("trace", () => new Worker(new URL("./trace-worker.ts", import.meta.url), { type: "module" }), {
  sources: ["engine"],                 // while trace runs, it has a port to engine's tree: one way
  releaseDebounce: 5_000,
});

const engine = hub.Open("engine");     // the app's own lease: engine lives as long as the app
const traceLease = hub.Open("trace");  // the Trace tab's: trace starts, and engine is opened for it
const store = new StoreAsync(traceLease, keyFunc);
// Trace tab teardown
store.Destroy();
traceLease.Release();                  // trace ends 5s later unless reopened; its lease on engine ends with it

hub.Restart("engine");                 // the app decided it's unhealthy: a new engine, every port re-issued

// in the trace worker
OnConnect("engine", port => {       // once per port: on start, and after each engine restart
  tree.DeleteRoute("/engine/");      // the replaced engine's roots
  Subscribe(port, { roots: ["index", "task_*"], form: "snapshot" }, update => {
    for (const key in update.roots) tree.WritePath(`/engine/${key}`, update.roots[key]);
    for (const key of update.deleted) tree.WritePath(`/engine/${key}`, undefined);
    tree.RunProjections();
    tree.Commit();
  });
});
```

- **`Register(name, factory, { sources?, releaseDebounce? })`** records how to create a worker and the workers it reads from; it creates nothing. The factory is the start hook: it creates the worker and sends the worker's starting intent, so every start, the first and each restart, begins the same way. Each source must be registered first, so the order of registrations is the dependency order, and a cycle can't be written.
- **`Open(name)` returns a lease:** a `MessagePort` to the worker, served by its host (the hub sends the other end in a `jt-serve` message). The first lease creates the worker. Main-thread stores use leases, never the `Worker` object, so the hub counts every use and a store has a port of its own.
- **A worker is released when its last lease ends**: at once, or `releaseDebounce` milliseconds later, cancelled when a lease is opened meanwhile (a component remounting). Releasing terminates the worker and ends its own leases on other workers, which can release them in turn. The next `Open` creates it again, from its factory. A worker that must outlive every view, like the engine, is held by a lease the app keeps.
- **`lease.Release()`** sends the worker `jt-unserve` with the lease's id on its own channel, so the host stops serving the lease's port and ends its subscriptions, releasing their keys; then it closes the port. The hub uses the worker's channel, not the port, because a connection's port was transferred to the consumer. Releasing twice does nothing.
- **`sources`** makes a one-way connection: the worker reads from each source's tree, and the source knows nothing of it. When the worker starts, the hub opens a lease on each source for it (starting the source if needed) and sends the worker the port in a `jt-connect` message naming the source; the worker's `OnConnect` handler gets it. The handler may return a cleanup, which runs (and the old port closes) before it gets a new port. A port that arrives before the handler is registered is kept for it: `HostPublisher` starts listening for them. The leases end when the worker is released.
- **A worker knows its sources.** The hub's first message to a worker it creates, on every start, is `jt-sources` with the worker's `sources`. `OnConnect` for any other source throws: at once when the list has arrived, or, for a handler registered while the worker's module first ran, as the worker's uncaught error when it arrives (the main thread's `Worker` `error` event). A worker the hub didn't create is never checked.
- **`Restart(name)`** terminates the worker, creates a new one from its factory, and re-issues every port to it: each lease gets a new port (a store over it reconnects), and each worker reading from it gets a new `jt-connect`. A restarted worker gets new ports to its own sources. Detecting that a worker is unhealthy is the app's (builder-app restarts the engine when a run times out); an uncaught error in a worker doesn't end it, so the hub doesn't restart on `error`.
- **`Unregister(name)`** terminates the worker now, ends every lease on it, releases its sources, and forgets the factory. It throws while a registered worker reads from it: unregister that one first. `Open` on a name that isn't registered throws.
- **`Destroy()`** unregisters every name, the last registered first, so each worker goes before its sources; as the framework's other `Destroy()` methods end what they own, every worker is terminated and every lease ended.
- **It never carries data.** Posts go directly between each port's two ends, so the main thread stays out of the source plane (builder-app's invariant 1).

### A worker subscribing to another tree

A worker that derives state from another worker's tree subscribes in the `"snapshot"` form, `Subscribe(port, { roots, form: "snapshot" }, onUpdate)`, and decides itself where the data goes. The framework delivers the source's roots; it doesn't write them anywhere.

- **An update is a map of the subscribed roots that changed**: `roots` (each changed root key and its whole value, from the source's committed snapshots), and `deleted` (root keys removed since the last update). The first update holds every root the filter matches, in the same shape; a subscriber that resubscribes (its `OnConnect` handler runs again) clears its route first.
- **The primary path is a route.** The subscriber writes each root under a route of its own tree (`/engine/<key>`). Routes are never posted, so the source's data stays in the worker and only what the tree derives from it reaches the main thread; writing it to a root would post the same data the other worker holds. Projections read the route as builder-app's read `/ids/*` today.
- **The local tree does the fine-grained work.** `WritePath` diffs each whole value into the route's state and applies only what changed, so the projections that read an unchanged part don't rerun. It's the same pattern as a client writing a bucket of data with `Store.Write`: send the whole value, let the tree find the changes.
- **Size is the cost to watch.** Each changed root crosses whole. Keyed data with wildcards keeps the changed roots to single entities, and the filter keeps out roots the subscriber doesn't read, but a large root that isn't keyed crosses whole on every change. builder-app has hit this with large JSON blobs between threads: a large object graph is received about twice as slowly by structured clone as it's parsed from text (its `worker-difftree-pattern.md` §3.15). Phase 4 measures bytes per update between workers before anything changes.
- **Committing stays explicit.** An update is one message the worker handles between batches; it runs projections and commits when the change should reach its own subscribers.
- **Keyed data needs the source's `keyFunc` in the subscriber's tree.** Editing an entity commits only the entity's own root (`task_1`); a root that refers to it (`list`) isn't in the diff, since the commit skips an entity whose key didn't change. The subscriber receives `task_1` alone, which is right only when its tree routes it to the entity's home by the same `keyFunc`, so that `/engine/list`'s slots hold the same object. With another `keyFunc`, or none, its `list` keeps stale copies.

**As built (builder-app's derived tabs):** the route, as above, but kept in the diff form. Each source has a follow
route in the subscriber's tree (`FollowRoutes({ project: entityKey, engine: undefined })` gives `/project/` and
`/engine/`), keyed with the source's keyFunc (a route without one keys nothing, rather than taking the tree's), with
no projections of its own, so the source's roots are held under their own keys, `$projection_*` included. Only
`DiffTreePublisher.ApplyDiff(records, route)` writes it; any other write to it throws. A `ChannelSubscription` in the
`"diff"` form delivers the posts, and the subscriber applies each one, runs its projections and commits. Only what
changed crosses, so a large keyed root (a project's rows) costs what an edit changed, not its size, and the
keyed-data rule above holds as stated: the route identifies data as the source does, so a slot inside it reads the
entity's change. A `ChannelSubscription` outlives each port: on `Connect` to a restarted source, its first state
deletes, in the same delivery, the roots the old source had and the new one hasn't, so a wildcard read of the route
reads nothing left behind. `StoreAsync.Reconnect` uses the same mechanism for a store.

### A store that outlives its tree

Subscribing yields the committed state first, so a store can move to a new tree:

```ts
store.Reconnect(newWorker, { reseed: true });
// 1. writes back every root this store has written, from its own state, in one batch
// 2. sends again the batches still waiting for an ack
// 3. subscribes; the first state replaces the store's, readers kept
```

- **The first state replaces every root**: roots the new tree holds are diffed into the store's nodes in place (a whole-root write is diffed against what the store holds, so unchanged parts keep their objects and readers), and roots it lacks are deleted. The batches sent again resolve once that first state is complete, since their changes arrive with it. Readers keep their subscriptions. This is F3. The store knows its first post because it's the one reconnecting; to delete what the new tree lacks it also needs to know the first state is complete, including when it's empty, so the host acknowledges a `jt-subscribe` after its first post, as it does a batch. That's the protocol's, not the payload's.
- **Reseeding needs no mirror.** A store's state is a prefix of the tree's commits, so for each root it wrote it already holds the last value the tree acknowledged. Projection roots aren't reseeded; the new tree recomputes them. Roots the worker writes itself (routes, ids, data from other trees) are rebuilt by the worker from the intent it's given, and its `OnConnect` handlers subscribe again.
- **Restarting is one call** (open question 9). The app decides a worker needs it; `hub.Restart(name)` creates the new worker from its factory, and every store over a lease on it reconnects with `reseed`. `store.Reconnect(channel, { reseed: true })` stays public for a store over a channel the hub didn't issue.

### Pending state

The store knows which batches are in flight and which roots each writes. `IsPending(root)` is true from a write to the ack of its batch, and clears on the ack or the failure, in the same update that applies the post. This is F6, with no extra protocol.

## What changes for builder-app

| Today | With push |
| --- | --- |
| Trace: `pending` note on a notes port, `tick` root, `write()`/`note()`, `tree.committed()` after each batch | The tree runs projections and commits when its work finishes |
| Trace: `flowStatus` reaches the view only with the next batch's reply | The worker commits the status as soon as it changes, without rerunning the views |
| Trace: `trace-host.ts` routes control messages around `ConnectWorkerToDiffTree` | `HostPublisher` ignores non-`jt-` messages |
| Trace: `trace-engine` control message carries a port from `EngineClient.connect` | `hub.Register("trace", factory, { sources: ["engine"] })` |
| Engine: `EngineClient` creates, restarts and re-connects the worker after a timeout | `hub.Register` with a factory; `hub.Restart("engine")` on a timeout |
| Trace: the service creates the worker and terminates it | `hub.Open("trace")` per view and `Release()` in teardown, with a `releaseDebounce` |
| Engine: `ResultPushWriter` over `DiffTreeWriter`, `PushStore` on the main thread | A `DiffTree` that commits per run; a read-only `StoreAsync` |
| Engine: `consumers` map and `connect` handling in `engine-worker.ts` | The host serves ports it's given |
| Engine: feeds by revision (`run` or `gone`, as JSON text); detached runs posted once to a named consumer | The current run's parts and `revision` as roots, each detached run as `whatif_<revision>`; consumers `Once` the keys they want, and the engine deletes a detached run when it's released |
| Trace: keeps the last two detached indexes and the last ask so they meet in either order | `Once` resolves whichever comes first |
| Any store: one failed batch stops it | Only that batch rejects |
| Any view: "waiting for the worker" inferred from posted statuses | `IsPending(root)` |

What stays the app's: which versions the source keeps and for how long (its timers, and what `OnReleased` does), telling "not yet" from "gone" by `revision`, the side cache, large views as text, and intent mirrors.

## Breaking changes

- `DiffTree.Commit()` posts to subscribers. It still doesn't run projections.
- The worker protocol changes; the worker bundle and the main thread upgrade together.
- `ConnectWorkerToDiffTree`, `WorkerQueue`, `DiffTreeWriter` and `PushStore` are removed; `SubscriptionManager`, `DiffTreePublisher`, `HostPublisher`, `WorkerHub` (with leases), `OnConnect`, `Subscribe` and `Once` are added. `DiffTree` gains `Committed`, `CommittedKeys` and `DeleteRoot`.
- `StoreAsync` takes a channel and subscribes. A failed batch no longer rejects later ones.

## Open questions

1. **Settled: the worker's own work commits explicitly**, with `RunProjections()` as a separate, optional step before it. Scheduling, deferring or batching commits and projections is left out until measurement shows a need (§Deferred: scheduled projections).
2. **Settled: no flow control in the framework.** A worker that commits on every step of a long build could post faster than the main thread applies. The host can't coalesce: a busy main thread hasn't seen the posts already waiting for it, so the worker can't know how far behind it is without every subscriber confirming each post, and the tree won't wait on subscribers. The rate is the writing code's choice: commit when a subscriber needs the change (a status, a finished piece of work), not on every slice of a stepped build. On the receiving side, each post is applied as its message is handled, and rendering is scheduled separately, so several posts applied before a frame render once. That is by design: a state change that must reach the DOM on its own (an animation's steps) is handled explicitly by the code that needs it. Phase 4 measures the posts per action and the time to apply them before anything more is designed.
3. **Settled: a filter per subscriber**, an array of root keys given at subscription, applied to the committed state sent first and to every post. An entry may be a root wildcard (`"task_*"`), the syntax projection reads already use. No tree-level "never posted" option: routes already hold what must stay in the tree. A filter must cover the entities its roots refer to: with a `keyFunc`, entities live under their own root keys and other roots refer to them by key, so a filter that names `"list"` but not its records' entities leaves the store with keys it can't resolve. A wildcard covers entities whose keys aren't known when the subscriber subscribes, when the `keyFunc` gives them a shared prefix. Not planned: a filter that adds every entity root a received root refers to; revisit if prefixes aren't enough.
4. **Settled: opaque keys are per tree, and keeping ownership right is the state design's job.** The diff is computed once, so opacity can't differ per subscriber. A subscriber that receives an opaque root and writes the value into a root that isn't opaque can end up with two owners of one object; the framework doesn't guard against it. Whoever designs the state system keeps opaque values opaque end to end.
5. **Settled: subscriptions replace the pull-by-version feed.** A version is a root key, a consumer names it in its filter, and `Once` takes it whenever it arrives (§Versions are keys). Releasing keys is the publisher's, opt-in by pattern; deleting them is the app's (§Releasing keys). Removing keys is the app's: a key nobody subscribes to is expired by the app's own timer, and `OnReleased` only reports, so any grace period is the app's callback. The manager adds `SubscriberCount(key)` for a timer to check (§Releasing keys).
6. **Settled: a subscribing worker gets a map of its subscribed roots, each changed root whole, and writes them itself**, usually to a route so they aren't posted on (§A worker subscribing to another tree). The local tree's write does the diff, as `Store.Write` does for a client. To watch: the size of what crosses between workers. If measurement shows large roots crossing on every change, the options are diff records with a tree method that applies them under a route path, or keying the data so the changed roots are smaller.
7. **Settled (revised): the hub owns a worker's lifetime, by its leases.** It creates a worker from its factory on the first lease and terminates it when the last ends, after an optional `releaseDebounce`. `StoreAsync.Destroy()` only unsubscribes and stops listening. A derived worker is scoped to its components by their leases; a long-lived one by a lease the app keeps (§Connecting workers). A worker created outside the hub is its creator's to terminate, as `@ComputedAsync` does.
8. **Settled: a same-thread listener that writes to the tree during a delivery throws**, as the emitter does on re-entry.
9. **Settled (revised): deciding to restart is the app's; restarting is the hub's.** The app detects an unhealthy worker (a timeout, its own error reports) and calls `hub.Restart(name)`. The hub re-creates it from its factory, which also sends its starting intent, re-issues every lease's port and connection, and each store over a lease reconnects with `reseed`, writing back the roots it wrote and resending its unacknowledged batches (§A store that outlives its tree).
10. **Settled: names.** `SubscriptionManager` (subscriptions for any use), `DiffTreePublisher` (owns a tree, the only way to commit it, shapes deliveries), `HostPublisher(publisher, scope)` (serves a publisher on a worker's channels), `WorkerHub` (owns workers by name: factories, leases, connections and restarts; carries no data; `Destroy()` ends them all), `Open` and `Release` (a lease on a worker), `sources` and `releaseDebounce` (the `Register` options: the workers it reads from, and how long it outlives its last lease), `OnConnect` (a consumer's side of a hub connection), `Subscribe` and `Once` (subscribing over a port), and the `jt-` message prefix.
11. **Settled: every commit goes through the publisher, which owns its tree.** Subscriptions are managed in two layers: a `SubscriptionManager` for any use (keys, wildcards, groups, exact-key counts, release), and a `DiffTreePublisher` that creates its `DiffTree`, exposes its write API and `Commit()` but never the tree, and shapes each commit per subscription (§Subscriptions outside the tree). No code holds a tree it could commit past the publisher. Acks are their own message (`jt-ack`), sent by the host after the commit's posts.

## Deferred: scheduled projections

Not part of this change; revisit if phase 4's measurement shows projections rerunning for bursts of batches. Acks no longer have to pair with replies, so projections needn't run inside each batch: the tree could commit roots at once and run projections later, promising every subscriber the latest state eventually rather than after each batch. What was worked out:

- **Coalesce rather than debounce.** A fixed window adds its delay to every result (builder-app measured and dropped a debounce, its §3.10). Running projections once the batches already waiting are handled collapses a burst into one run and costs a single change nothing. A delay could be an option for trees with costly projections.
- **Two levels of ack.** `jt-ack` (the batch's roots are applied) and `jt-settled { through }` (projections have run for everything up to it, and that commit is posted). `Flush()` and write promises would wait for `settled`, so "await, then read a projection" keeps working; `IsPending` could stay on `ack`.
- **Projection errors leave the batch.** A scheduled run is no batch's fault, so its error goes to the store's `Error`; a batch fails only on its own writes.
- **A policy per publisher.** `"scheduled"` for hosted trees, `"immediate"` for `StoreSync`, whose projection outputs must be readable on the next line.
- **Quiescent consistency.** Subscribers may see roots ahead of projections on the way, as views already allow (builder-app §3.8); a quiet period always ends with a consistent commit, unless a projection keeps throwing.

## Suggested order

1. **Done. The tree and the publisher:** `Committed`, `CommittedKeys` and `DeleteRoot` on the tree; `SubscriptionManager` (filters, wildcards, ids, groups, counts, `SubscriberCount`, `OnReleased`); `DiffTreePublisher` over it (the two forms, the committed state on subscribe, `seq`, `Once`). `StoreSync` over it, with no behaviour change.
2. **Done. The worker side:** `HostPublisher` (with `Serve` for ports, `jt-subscribed`, and `jt-disconnect` handling), and `StoreAsync` over posts with acks, `Flush()` by ack, per-batch failure and a `roots` option. `Subscribe` and `Once` over a channel. `WorkerQueue`, `ConnectWorkerToDiffTree`, `PushStore` and `DiffTreeWriter` are gone. `StoreAsync.Destroy()` no longer terminates the worker; `@ComputedAsync` terminates the one it creates.
3. **Done. The hub:** `WorkerHub` (`Register` with a factory, `sources` and `releaseDebounce`, `Open` and leases, `Restart`, `Unregister`, `Destroy`), `jt-serve` and `jt-connect` handling in the host and `OnConnect`, `StoreAsync` over a lease, `Reconnect` with `reseed` (using `jt-subscribed`). Not yet in a phase: `IsPending(root)` (§Pending state).
4. **Done. builder-app:** the trace store first (it has the most workarounds), then the result index, then the project store. Measure posts per action, bytes per post and the main thread's time applying them against today, including a stepped build that commits its status while the user types, and bytes per update and the time to receive it between workers. See §Phase 4: builder-app.

## Phase 4: builder-app

builder-app's branch `feature/diff-tree-push` moves its three worker stores onto the push, on this branch's build of j-templates. The table in §What changes for builder-app holds, with these differences.

- **The engine's replies share its channel with the result store.** `EngineClient`'s init and run requests are its own messages, and a run's reply says its index is in the store. A lease port is a second channel, and messages on two channels have no order between them, so a store over a lease could get the reply before the post it depends on. The read-only `StoreAsync` subscribes over the engine `Worker` itself, which `HostPublisher` serves too: the commit's post precedes the reply. `EngineService` still holds a lease, which keeps the worker running for the app's life; the hub's factory hands each new worker to the client (`start`) and to the store (`Reconnect`). Generally: **a protocol beside the tree goes on the channel its subscriber uses**, or it needs an ack of its own.
- **The trace worker's intent is roots, not control messages.** `load` (the run to draw, as its document's text) and `whatIfRun` (the what-if's revision) are written by `TraceService`'s store like the Tab's other state. The worker reacts to them through a same-thread `"snapshot"` subscription on its own publisher, deferred a microtask since a delivery can't write to its tree. A restarted trace worker gets them back by `reseed`. The notes port, the `tick` root and every control message are gone.
- **The trace worker commits its own work at the end of the turn**, with the projections only when a route they read changed: `status` is a root the worker writes and commits on its own, without rerunning the views.
- **Detached runs are `detached_<revision>` roots**, opaque, so the engine never walks them; the trace worker takes one with `Once`, and the engine deletes it on `OnReleased`, keeping the last two for a consumer that hasn't asked yet. A what-if the trace worker hadn't taken when the engine restarted fails with a message rather than waiting.
- **The run's index is taken, not fed.** The trace worker `Once`s `revision`; when it's the run asked for, it `Once`s `revision` and every part, and checks `revision` again, since a newer run may have committed between. Another revision is `gone`.
- **The trace worker's lease is held for the service's life**, not per view: the run drawn is kept until the user reloads (FR-15.3), so releasing the worker when the tab closes would rebuild the flow on return. A per-view lease with a `releaseDebounce` is a product decision, not done here.
- `IsPending(root)` isn't done; no view needed it in the migration.

### Measurements

On the same machine, today (`baa5946`, j-templates 9.0.1) against the push. `tests/perf/result-push-perf.test.ts` and `tests/perf/trace-store-perf.test.ts` in builder-app; the trace store's baseline ran an equivalent spec on `baa5946`. Node, every worker on one thread; a structured clone is timed both ways (serialize and deserialize).

**The result index, engine worker → main thread** (one post per run; today one push message):

| Workload | First run post | Copied as text, today | Structured clone | Main thread apply | One-value edit |
| --- | --- | --- | --- | --- | --- |
| projection | 3633 kB | 30–40 ms | 42–57 ms | 23–35 ms | 2 kB, 0 ms |
| router | 1217 kB | 10–16 ms | 8–13 ms | 7–13 ms | 2 kB, 0 ms |
| trace | 4098 kB | 24–45 ms | 21–38 ms | 17–32 ms | 7 kB, 0 ms |

**The trace store, trace worker → main thread**:

| Action | Today | With the push |
| --- | --- | --- |
| A key typed, a pick | 1 batch up, 1 reply down | 1 batch up, 1 post and 1 ack down |
| Load (the worker's own work: index taken, flow built) | 3 notes, 3 tick batches and 3 replies: 3 round trips | 4 posts, no round trip |
| Load, kB to the main thread | 1–2 kB | 26 kB (trace), 44 kB (visibility): the `load` root's document text comes back, as every root the store writes does |
| A key typed during the flow's build (visibility, 497k nodes) | committed in 14–16 ms median, 19–49 ms longest | 15–16 ms median, 18–38 ms longest |
| Main thread copy and apply per post | 0–1 ms | 0–1 ms |

The build's slices are 13 ms median, 38–181 ms longest; a batch waits at most one slice, as before. Projections ran on every tick batch before; a status-only commit now runs none.

**The run's index, engine worker → trace worker** (once per Trace load; today a feed answered with JSON text):

| Workload | Size | JSON text, today | Structured clone |
| --- | --- | --- | --- |
| trace | 4 MB | 26–38 ms | 123–227 ms |
| visibility | 90 MB | 609–951 ms | 496–2741 ms |

The e2e suite (chromium) runs as before: run alone, every spec passes and takes the same time on both; under full-suite load, the imported-rule-set router spec times out on both.

### Phase 4 findings

1. **Structured clone is slower than JSON text for the index between workers**, 4–7× on the trace workload and up to 3× (noisily) on the visibility pattern, on every Trace load. It's off the main thread, but it delays the drawing. Open question 6 asked about large roots crossing on every change; this is large roots crossing once per load. Options: carry the parts as text (the app's "large views as text"), either written by the engine for every run (a stringify per run, wanted or not) or on request through a root the trace worker writes to the engine's tree, answered under a versioned key; or leave it, since a load is rare. Not decided.
2. **No flow control is needed** (open question 2 stays settled): a batch during a stepped build is answered after the current slice, as before, and the worker's own commits are few (4 per load).
3. **Scheduled projections stay deferred**: projections reran per batch before and still do; no burst showed in the measurements.
4. **The first-run post to the main thread is about the same as before** for two workloads and 40% slower for the projection workload's 3.6 MB; edits are a few kB either way.

## Tests

- A worker commit posted between a batch being sent and applied: the store applies both, and the batch's promise waits for its own ack.
- `Flush()` with nothing in flight resolves at once; with a batch in flight it resolves on that batch's ack.
- An empty batch is acknowledged.
- A commit without `RunProjections()` posts the changed roots and leaves projection outputs as they were; the next batch's commit brings them up to date.
- A projection that throws during a batch rejects that batch, and its changes are still posted.
- A failed batch rejects only itself; the next batch applies.
- A subscriber created after several commits starts from the committed state.
- Two subscribers get the same posts; a root filter limits one of them, its first committed state included.
- A wildcard entry receives entity roots created after the subscription.
- A subscribing worker's first update has every matched root, in the same shape as later ones, which carry only changed roots and deletions; nothing is sent when no root matches.
- A `"diff"` and a `"snapshot"` subscriber on one commit get the same changes, as records and as whole roots.
- A subscriber's first state is the committed state even while uncommitted writes are pending; the next commit applies cleanly on top of it, splices included.
- `Once` resolves at once when its keys exist, and on the commit that adds the last one when they don't; aborting it ends the subscription.
- `OnReleased` fires when a key's last exact subscription ends, not for a key never subscribed, and not for a wildcard subscription's keys.
- `SubscriberCount(key)` counts exact subscriptions only, and falls on unsubscribe and on `Disconnect`.
- `jt-disconnect` ends a channel's subscriptions and can release keys.
- Two subscriptions on one channel get updates tagged with their own ids.
- A channel that writes without subscribing gets its acks; an ack arrives after the posts of the commit it answers.
- `SubscriptionManager` on its own: exact and wildcard matching, `Disconnect(group)`, and release counts, with no tree involved.
- Roots written to a route from an update aren't posted to the worker's own subscribers; a projection that reads them is.
- Non-`jt-` messages on a hosted channel reach the app's own listener.
- `Register` creates nothing; the first `Open` creates the worker, and the factory runs again on each restart and after each release.
- The last `Release` terminates the worker at once without `releaseDebounce`, and after it with one; an `Open` during the debounce keeps the same worker.
- Releasing a consumer ends its leases on its sources, which can release them in turn; a source another lease holds keeps running.
- A worker's first message from the hub, on every start, is `jt-sources`; `OnConnect` for a source it doesn't list throws, at once or when the list arrives.
- A worker with `sources` gets its port to each when it starts, again after a source restarts, and again when it restarts itself; a source must be registered before the worker that reads from it.
- `Restart` re-issues every lease's port, and a store over a lease reconnects with its readers kept.
- `Reconnect` with `reseed` writes back the roots the store wrote and resends its unacknowledged batches; projection roots come from the new tree.
- `Release` sends `jt-unserve`, so the worker ends the lease's subscriptions and releases their keys.
- `Unregister` terminates the worker, ends its leases, and makes `Open` throw; it throws while another registered worker reads from it.
- `Destroy` unregisters every name, the last registered first: every worker is terminated and every lease ended.
- A same-thread listener that writes to the tree during a delivery throws.
- Two publishers on one thread: a `"snapshot"` subscription receives the source's commits inside `Commit()`, the derived tree's commit reaches its own subscribers in the same call, and a write back to the source from that chain throws.
- `source.Once(keys)` on one thread resolves from the delivery that adds the last key.
- `StoreAsync.Destroy()` leaves the worker running.
- `IsPending(root)` from write to ack, cleared on failure.
