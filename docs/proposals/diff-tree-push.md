# Proposal: DiffTree pushes its commits

Status: design settled, not implemented. Measurement in phase 4 decides the deferred items (§Deferred: scheduled projections) and whether whole-root updates between workers are small enough (open question 6).

## Summary

A `DiffTree` posts every `Commit()` to whoever subscribes to it. A store is one subscriber: it sends batches of writes to the tree and applies the tree's posts, whatever caused them. The tree no longer answers a batch with its reply; it runs its projections, commits, and the post that follows says which batch it covers. `Flush()` and each write's promise wait for that post.

`RunProjections()` and `Commit()` stay separate steps. A store's batch always runs both. Code that writes to the tree directly decides: it can commit a small change at once (a flag saying a large write is in flight) without recomputing projections, and run them when its work is done.

Subscriptions live outside the tree, in two layers: a use-case agnostic subscription manager (keys, wildcards, groups, counts, release), and a DiffTree publisher that owns its tree, is the only way to commit it, and uses only the tree's public API. The publisher shapes each commit for each subscriber, as diff records for a store or as whole changed roots for another tree, filtered by root key. The same commit reaches every subscriber, on the same thread or across workers. A listener manager on the main thread makes the channels between workers and re-issues them when a worker is replaced, so one worker can subscribe to a tree in another. A version of some data, such as one engine run, is a root key, and a consumer names the version it wants in its filter.

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
subs.OnSubscribed(sub => { /* send its first state */ });
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

- **The first state is the committed state.** On `OnSubscribed`, the publisher sends `Committed(key)` for each matching key in `CommittedKeys()`; later commits follow. The current state (`Snapshot`) won't do: it holds uncommitted writes, which the next commit's diff would apply a second time, and a positional splice applied twice corrupts an array.
- **Which roots changed comes from the diff.** Every record's first path segment is its root key: the changed keys are the distinct `path[0]`, and the deleted ones are `delete` records at `[key]`. After the commit, `Committed(key)` is each changed root's whole new value, shared and never mutated, so reading it costs nothing.
- **Each subscription names its form.** `"diff"` gets the commit's records whose root matches its filter (a store, which applies them to its nodes). `"roots"` gets `{ roots: { [key]: Committed(key) }, deleted, initial }` for the matching changed roots (another tree, which writes them: §A worker subscribing to another tree). The first state takes the same two forms: a `write` record per matching key, or the map with `initial: true`. Both come from one commit; nothing is diffed twice.
- **Subscriptions have ids.** One channel can carry several (a long-lived one and a `Once`), and every delivery names the subscription it's for.
- **The tree-specific parts are the publisher's:** the first state, `seq`, the two forms, and `Once`, which needs to know what "present" means for a key.

### Versions are keys

A version of some data (an engine run, a what-if's result) is a root key of its own, and a consumer names the version it wants in its filter.

```ts
// engine worker: the current run's parts and its revision, and each detached run under its own key
tree.WritePath(`whatif_${revision}`, index);
tree.Commit();

// trace worker
Subscribe(port, { roots: ["revision"], form: "roots" }, update => { /* staleness: compare revisions */ });
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
- **A subscriber names the roots it receives**, as an array of root keys given when it subscribes (`roots`). An entry may be a root wildcard (`"task_*"`), as in projection reads. Omitted, it receives every root. Every diff record's first path segment is its root key, so this is a filter over the shared diff, not a second diff. The committed state sent first is filtered the same way.
- **The filter is how a derivation worker limits what it takes from a source tree.** A trace worker subscribed to the engine's tree names the roots its projections read and receives nothing else. On the main thread it covers F5 (root projections no subscriber reads, such as builder-app's `entityBuilt`). Data that should never leave the tree already has a place: routes are never posted.
- **To change its roots, a subscriber subscribes again** and gets the committed state of the new set.
- **A filter covers the entities its roots refer to.** With a `keyFunc`, entities live under their own root keys and other roots refer to them by key, so a filter naming `"list"` must also match the entity keys its records point to, usually with a wildcard over the `keyFunc`'s prefix. A store that receives a reference to a root it was never sent throws when the reference is read.

### Same thread: `StoreSync`

`StoreSync` owns a `DiffTreePublisher` and subscribes to it in the `"diff"` form. It keeps its behaviour: `Write` is a batch of one, so it applies, runs projections, commits, and the post is applied before `Write` returns. Anything else on the thread subscribes to the same publisher.

A listener that writes to the tree from inside a delivery would re-enter `Commit()`. It throws, as the emitter does today on re-entry (open question 8).

### Same thread: one tree subscribing to another

Two trees on one thread connect through the source's publisher directly, with no channel:

```ts
const source = new DiffTreePublisher(keyFunc, sourceRoutes);
const derived = new DiffTreePublisher(keyFunc, derivedRoutes);

source.Subscribe({ roots: ["index", "task_*"], form: "roots" }, update => {
  if (update.initial) derived.DeleteRoute("/source/");
  for (const key in update.roots) derived.WritePath(`/source/${key}`, update.roots[key]);
  for (const key of update.deleted) derived.WritePath(`/source/${key}`, undefined);
  derived.RunProjections();
  derived.Commit();          // delivered to derived's own subscribers, still inside source.Commit()
});

const run = await source.Once(["index", "revision"]);
```

- **Delivery is synchronous.** A subscriber's callback runs inside the source's `Commit()`, before it returns, so a change passes through a chain of trees in one call stack. The first state is delivered inside `Subscribe`.
- **Writing to another tree during a delivery is allowed; re-entering the delivering one isn't.** Open question 8's rule is about the tree that is delivering: if `source` delivers to `derived`, and `derived`'s commit delivers to a subscriber that writes to `source`, that write throws. A cycle on one thread fails loudly instead of looping.
- **Values are shared, not cloned.** With no `postMessage` between them, the `"roots"` form hands over the source's committed snapshots themselves. `WritePath` copies what it's given into the subscriber's tree, so writing them in is safe; a subscriber that keeps them treats them as read-only, as it would a snapshot or an opaque value.
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
- **`jt-subscribe` / `jt-unsubscribe`**: a subscription by id, with its roots and form, grouped by the channel: the committed state first, then every commit, shaped for it. Or its end.
- **`jt-disconnect`**: from the hub, when the channel is replaced or ended: `Disconnect(channel)` ends every subscription on it.
- **`jt-markopaque`**: the existing opaque keys, sent ahead of the first batch.

A channel can write, subscribe, or both. Several channels may write to one tree; each gets its own acks, and the app keeps one writer per key (builder-app's invariant 5).

### The store over a channel

```ts
const store = new StoreAsync(worker, keyFunc, { opaque, roots });   // writes and reads, as today
const results = new StoreAsync(port, keyFunc);                      // reads only: no writes made
```

- **`StoreAsync` takes a channel** (a `Worker` or `MessagePort`), subscribes on construction, and applies every post. With no writes it's a read-only store, so `PushStore` goes.
- **`WorkerQueue` goes.** Nothing pairs messages with batches; acks name them.
- **`Destroy()`** unsubscribes and stops listening. It never terminates the `Worker`: whoever created it does (open question 7).

### Connecting workers: the listener manager

On the main thread, a manager knows each worker by name and makes channels between them:

```ts
const hub = new WorkerHub();
hub.Register("engine", engineWorker);
hub.Register("trace", traceWorker);
hub.Connect("trace", "engine");        // trace gets a port to engine's tree, now and after any restart
hub.Replace("engine", newEngineWorker); // every connection to it is re-issued

// in the trace worker
OnConnect("engine", port => {
  Subscribe(port, { roots: ["index", "task_*"], form: "roots" }, update => {
    if (update.initial) tree.DeleteRoute("/engine/");
    for (const key in update.roots) tree.WritePath(`/engine/${key}`, update.roots[key]);
    for (const key of update.deleted) tree.WritePath(`/engine/${key}`, undefined);
    tree.RunProjections();
    tree.Commit();
  });
});
```

- **`Connect(consumer, source)`** makes a `MessageChannel`, sends one end to each worker as a `jt-connect` message naming the other, and keeps the pair. The source's host serves its end; the consumer's `OnConnect` handler gets the other.
- **`Replace(name, worker)`** re-issues every channel the replaced worker was part of, and sends `jt-disconnect` on the old ones that are still open. A consumer's handler runs again with the new port, and a store resubscribes and gets the committed state of the new tree.
- **It never carries data.** Posts go directly between the workers, so the main thread stays out of the source plane (builder-app's invariant 1).
- **It doesn't create, restart or terminate workers.** The app does (builder-app's `EngineClient` restarts on a timeout) and tells the manager.
- **`Unregister(name)`** forgets a worker: it sends `jt-disconnect` on every channel the worker was part of, so the sources end its subscriptions and release its keys. With it, a derived worker can live as long as a component: the component creates the worker and registers it, and its teardown calls `Unregister`, the store's `Destroy()` and `worker.terminate()`.

### A worker subscribing to another tree

A worker that derives state from another worker's tree subscribes in the `"roots"` form, `Subscribe(port, { roots, form: "roots" }, onUpdate)`, and decides itself where the data goes. The framework delivers the source's roots; it doesn't write them anywhere.

- **An update is a map of the subscribed roots that changed**: `roots` (each changed root key and its whole value, from the source's committed snapshots), `deleted` (root keys removed since the last update) and `initial` (true on the first update after subscribing or reconnecting: everything the filter matches, which replaces whatever the subscriber held).
- **The primary path is a route.** The subscriber writes each root under a route of its own tree (`/engine/<key>`). Routes are never posted, so the source's data stays in the worker and only what the tree derives from it reaches the main thread; writing it to a root would post the same data the other worker holds. Projections read the route as builder-app's read `/ids/*` today.
- **The local tree does the fine-grained work.** `WritePath` diffs each whole value into the route's state and applies only what changed, so the projections that read an unchanged part don't rerun. It's the same pattern as a client writing a bucket of data with `Store.Write`: send the whole value, let the tree find the changes.
- **Size is the cost to watch.** Each changed root crosses whole. Keyed data with wildcards keeps the changed roots to single entities, and the filter keeps out roots the subscriber doesn't read, but a large root that isn't keyed crosses whole on every change. builder-app has hit this with large JSON blobs between threads: a large object graph is received about twice as slowly by structured clone as it's parsed from text (its `worker-difftree-pattern.md` §3.15). Phase 4 measures bytes per update between workers before anything changes.
- **Committing stays explicit.** An update is one message the worker handles between batches; it runs projections and commits when the change should reach its own subscribers.
- **Keyed data needs the source's `keyFunc` in the subscriber's tree.** Editing an entity commits only the entity's own root (`task_1`); a root that refers to it (`list`) isn't in the diff, since the commit skips an entity whose key didn't change. The subscriber receives `task_1` alone, which is right only when its tree routes it to the entity's home by the same `keyFunc`, so that `/engine/list`'s slots hold the same object. With another `keyFunc`, or none, its `list` keeps stale copies.

### A store that outlives its tree

Subscribing yields the committed state first, so a store can move to a new tree:

```ts
store.Reconnect(newWorker, { reseed: true });
// 1. writes back every root this store has written, from its own state, in one batch
// 2. sends again the batches still waiting for an ack
// 3. subscribes; the first state replaces the store's, readers kept
```

- **The first state replaces every root**: roots the new tree holds are diffed into the store's nodes in place, and roots it lacks are deleted. Readers keep their subscriptions. This is F3.
- **Reseeding needs no mirror.** A store's state is a prefix of the tree's commits, so for each root it wrote it already holds the last value the tree acknowledged. Projection roots aren't reseeded; the new tree recomputes them. Roots the worker writes itself (routes, ids, data from other trees) are rebuilt by the worker from the intent it's given, and its `OnConnect` handlers subscribe again.
- **Recovery is the app's** (open question 9). The framework makes each step one call; the app decides whether to recover at all, and when: create the worker, `hub.Replace`, `store.Reconnect`.

### Pending state

The store knows which batches are in flight and which roots each writes. `IsPending(root)` is true from a write to the ack of its batch, and clears on the ack or the failure, in the same update that applies the post. This is F6, with no extra protocol.

## What changes for builder-app

| Today | With push |
| --- | --- |
| Trace: `pending` note on a notes port, `tick` root, `write()`/`note()`, `tree.committed()` after each batch | The tree runs projections and commits when its work finishes |
| Trace: `flowStatus` reaches the view only with the next batch's reply | The worker commits the status as soon as it changes, without rerunning the views |
| Trace: `trace-host.ts` routes control messages around `ConnectWorkerToDiffTree` | `HostPublisher` ignores non-`jt-` messages |
| Trace: `trace-engine` control message carries a port from `EngineClient.connect` | `hub.Connect("trace", "engine")` |
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
- `ConnectWorkerToDiffTree`, `WorkerQueue`, `DiffTreeWriter` and `PushStore` are removed; `SubscriptionManager`, `DiffTreePublisher`, `HostPublisher`, `WorkerHub`, `OnConnect`, `Subscribe` and `Once` are added. `DiffTree` gains `Committed`, `CommittedKeys` and `DeleteRoot`.
- `StoreAsync` takes a channel and subscribes. A failed batch no longer rejects later ones.

## Open questions

1. **Settled: the worker's own work commits explicitly**, with `RunProjections()` as a separate, optional step before it. Scheduling, deferring or batching commits and projections is left out until measurement shows a need (§Deferred: scheduled projections).
2. **Settled: no flow control in the framework.** A worker that commits on every step of a long build could post faster than the main thread applies. The host can't coalesce: a busy main thread hasn't seen the posts already waiting for it, so the worker can't know how far behind it is without every subscriber confirming each post, and the tree won't wait on subscribers. The rate is the writing code's choice: commit when a subscriber needs the change (a status, a finished piece of work), not on every slice of a stepped build. On the receiving side, each post is applied as its message is handled, and rendering is scheduled separately, so several posts applied before a frame render once. That is by design: a state change that must reach the DOM on its own (an animation's steps) is handled explicitly by the code that needs it. Phase 4 measures the posts per action and the time to apply them before anything more is designed.
3. **Settled: a filter per subscriber**, an array of root keys given at subscription, applied to the committed state sent first and to every post. An entry may be a root wildcard (`"task_*"`), the syntax projection reads already use. No tree-level "never posted" option: routes already hold what must stay in the tree. A filter must cover the entities its roots refer to: with a `keyFunc`, entities live under their own root keys and other roots refer to them by key, so a filter that names `"list"` but not its records' entities leaves the store with keys it can't resolve. A wildcard covers entities whose keys aren't known when the subscriber subscribes, when the `keyFunc` gives them a shared prefix. Not planned: a filter that adds every entity root a received root refers to; revisit if prefixes aren't enough.
4. **Settled: opaque keys are per tree, and keeping ownership right is the state design's job.** The diff is computed once, so opacity can't differ per subscriber. A subscriber that receives an opaque root and writes the value into a root that isn't opaque can end up with two owners of one object; the framework doesn't guard against it. Whoever designs the state system keeps opaque values opaque end to end.
5. **Settled: subscriptions replace the pull-by-version feed.** A version is a root key, a consumer names it in its filter, and `Once` takes it whenever it arrives (§Versions are keys). Releasing keys is the publisher's, opt-in by pattern; deleting them is the app's (§Releasing keys). Removing keys is the app's: a key nobody subscribes to is expired by the app's own timer, and `OnReleased` only reports, so any grace period is the app's callback. The manager adds `SubscriberCount(key)` for a timer to check (§Releasing keys).
6. **Settled: a subscribing worker gets a map of its subscribed roots, each changed root whole, and writes them itself**, usually to a route so they aren't posted on (§A worker subscribing to another tree). The local tree's write does the diff, as `Store.Write` does for a client. To watch: the size of what crosses between workers. If measurement shows large roots crossing on every change, the options are diff records with a tree method that applies them under a route path, or keying the data so the changed roots are smaller.
7. **Settled: whoever creates a `Worker` terminates it.** `StoreAsync.Destroy()` only unsubscribes and stops listening, and the hub only routes. The aim is that a derived worker can be scoped to a component's lifecycle: created and registered when the component is, `Unregister`ed and terminated in its teardown (§Connecting workers).
8. **Settled: a same-thread listener that writes to the tree during a delivery throws**, as the emitter does on re-entry.
9. **Settled: recovery is the app's.** A failure in app code is the app's to recover from, if at all. The framework makes rehydrating a worker easy: `hub.Replace` re-issues its channels, and `store.Reconnect(worker, { reseed: true })` writes back the roots the store wrote and resends its unacknowledged batches (§A store that outlives its tree).
10. **Settled: names.** `SubscriptionManager` (subscriptions for any use), `DiffTreePublisher` (owns a tree, the only way to commit it, shapes deliveries), `HostPublisher(publisher, scope)` (serves a publisher on a worker's channels), `WorkerHub` (the main thread's channel broker, which carries no data), `OnConnect` (a consumer's side of a hub connection), `Subscribe` and `Once` (subscribing over a port), and the `jt-` message prefix.
11. **Settled: every commit goes through the publisher, which owns its tree.** Subscriptions are managed in two layers: a `SubscriptionManager` for any use (keys, wildcards, groups, exact-key counts, release), and a `DiffTreePublisher` that creates its `DiffTree`, exposes its write API and `Commit()` but never the tree, and shapes each commit per subscription (§Subscriptions outside the tree). No code holds a tree it could commit past the publisher. Acks are their own message (`jt-ack`), sent by the host after the commit's posts.

## Deferred: scheduled projections

Not part of this change; revisit if phase 4's measurement shows projections rerunning for bursts of batches. Acks no longer have to pair with replies, so projections needn't run inside each batch: the tree could commit roots at once and run projections later, promising every subscriber the latest state eventually rather than after each batch. What was worked out:

- **Coalesce rather than debounce.** A fixed window adds its delay to every result (builder-app measured and dropped a debounce, its §3.10). Running projections once the batches already waiting are handled collapses a burst into one run and costs a single change nothing. A delay could be an option for trees with costly projections.
- **Two levels of ack.** `jt-ack` (the batch's roots are applied) and `jt-settled { through }` (projections have run for everything up to it, and that commit is posted). `Flush()` and write promises would wait for `settled`, so "await, then read a projection" keeps working; `IsPending` could stay on `ack`.
- **Projection errors leave the batch.** A scheduled run is no batch's fault, so its error goes to the store's `Error`; a batch fails only on its own writes.
- **A policy per publisher.** `"scheduled"` for hosted trees, `"immediate"` for `StoreSync`, whose projection outputs must be readable on the next line.
- **Quiescent consistency.** Subscribers may see roots ahead of projections on the way, as views already allow (builder-app §3.8); a quiet period always ends with a consistent commit, unless a projection keeps throwing.

## Suggested order

1. **The tree and the publisher:** `Committed`, `CommittedKeys` and `DeleteRoot` on the tree; `SubscriptionManager` (filters, wildcards, ids, groups, counts, `SubscriberCount`, `OnSubscribed`, `OnReleased`); `DiffTreePublisher` over it (the two forms, the committed state on subscribe, `seq`, `Once`). `StoreSync` over it, with no behaviour change. `DiffTreeWriter` removed.
2. **The worker side:** `HostPublisher`, and `StoreAsync` over posts with acks, `Flush()` by ack and per-batch failure. `WorkerQueue`, `ConnectWorkerToDiffTree` and `PushStore` go.
3. **Between workers:** `WorkerHub` (`Register`, `Connect`, `Replace`, `Unregister`), `OnConnect`, `jt-disconnect`, `Reconnect` with `reseed`.
4. **builder-app:** the trace store first (it has the most workarounds), then the result index, then the project store. Measure posts per action, bytes per post and the main thread's time applying them against today, including a stepped build that commits its status while the user types, and bytes per update and the time to receive it between workers.

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
- A subscribing worker's first update is `initial`, with every matched root; later updates carry only changed roots and deletions.
- A `"diff"` and a `"roots"` subscriber on one commit get the same changes, as records and as whole roots.
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
- `Replace` re-issues a connection, and a store resubscribes with its readers kept.
- `Reconnect` with `reseed` writes back the roots the store wrote and resends its unacknowledged batches; projection roots come from the new tree.
- `Unregister` ends a worker's subscriptions at every source and releases its keys.
- A same-thread listener that writes to the tree during a delivery throws.
- Two publishers on one thread: a `"roots"` subscription receives the source's commits inside `Commit()`, the derived tree's commit reaches its own subscribers in the same call, and a write back to the source from that chain throws.
- `source.Once(keys)` on one thread resolves from the delivery that adds the last key.
- `StoreAsync.Destroy()` leaves the worker running.
- `IsPending(root)` from write to ack, cleared on failure.
