# Proposal: a store receives a root while something reads it

Status: phases 1–3 built, uncommitted: the emitter's watcher (`Emitter.Watch`, `EmitterEvent`), the store's root watch (`ReadStore`'s `watch` patterns and callback, `ObservableNode.WatchProperty`), and `StoreAsync`'s `demand` and `demandDebounce` options with `Hold`. Key patterns are one helper (`Utils/pattern.ts`). Open: the benchmark of `On`/`Remove` (phase 1), and builder-app (phase 4).

What differs from the design below: the watch API is `Emitter.Watch(emitter, callback)` on an emitter of its own in the header slot, so an emitter takes several watchers, added after it's created; a store watches roots by pattern with one callback that's given the root key; and a demand root's release timer and microtask use the framework's scheduling (`_setTimeout`, `_queueMicrotask`), so they run at once under `SYNC_SCHEDULING`.

## Summary

A `StoreAsync` names the roots it receives once, when it subscribes (`IStoreAsyncOptions.roots`), and receives every one of them for as long as it lives. This proposal adds roots it receives **on demand**: a root matching one of the store's `demand` patterns is subscribed while some reactive scope reads it through `Get`, and released a grace period after the last one stops. Nothing in the app asks for a root; reading it is the request.

```ts
const results = new StoreAsync(hub.Open("engine"), {
  roots: ["counts", "revision", "run"],          // always, as today
  demand: ["type:*", "procedure:*", "slice:*"],  // while read
});

// In a component: reading the root subscribes to it, and its first state arrives as a post.
// Until then it reads as undefined; when the component is destroyed, the root is released.
@Computed() get sheet() {
  return results.Get<TypeResult>(`type:${this.Data.typeName}`);
}
```

The host needs nothing new. It already serves several subscriptions per channel, each with its own roots; a new subscription's first post carries only its own roots; a commit is diffed once and filtered per subscription; and exact keys are counted and released (`SubscriberCount`, `OnReleased`). What's missing is on the client: nothing tells a store when one of its roots gains its first reader or loses its last. That comes from one hook on `Emitter`.

## Motivation

builder-app's engine worker publishes each run's result index on a tree, and the main thread's store receives all of it (`roots: [...every part, "revision", "run"]`). Most of the main thread reads only a small `counts` root: the canvas cards, the overviews, the data view's sheet list. The large parts (every object's values, every procedure instance and its guards, every Slice's stages) are read one entity at a time, by whichever sheet or inspector is open, and most of them by nothing at all.

Measured in Chromium on the UE-01 rule set (about 30,000 objects, 87,000 procedure instances), after an import:

- the run's posts cost the main thread **3.9 s of long tasks**: about 2.1 s in the channel's listener, which is the structured clone of the post (`event.data`), and 0.7 s applying the diff (`JsonApplyDiff`, `JsonDeepClone`);
- the first run after load is the same cost: this is time until the app is usable, and it grows with the data.

Re-subscribing with a new set of roots doesn't help: a new subscription posts the current state of every root it names, so each change of the set would post again what the store already holds. A store that subscribes per root, and only to the roots read, posts each root once when it's first read and then only its changes.

## Design

### The emitter's watcher

An `Emitter` is `[[tombstones, emitIndex], ...callbacks]`. A scope that reads an observable value adds its `setCallback` to that value's emitter (`Emitter.On`, from `UpdateEmitters`) and removes it when it stops reading it or is destroyed (`Emitter.Remove`). The live count is `emitter.length - 1 - emitter[0][0]`.

The header gets an optional third slot, a watcher, called when the live count goes from 0 to 1 and from 1 to 0:

```ts
export type Emitter = [[number, number, EmitterWatcher?], ...EmitterCallback[]];
export type EmitterWatcher = (watched: boolean) => void;

Emitter.Watch(emitter, watched => { /* first reader, or last one gone */ });
```

- **`On`** pushes, then calls the watcher when the live count is now 1. **`Remove`** calls it when the live count is now 0, and only when it removed something. **`Clear`** calls it when the count was above 0.
- **It reports transitions, not the count.** The watcher runs inside `On` and `Remove`, which run inside a scope's update: it must only record and schedule, never read or write observable data.
- **A scope that re-runs doesn't flicker.** `UpdateEmitters` keeps an emitter a scope still reads (each strategy compares the old and new lists), so a continuing reader never takes the count to 0. A component destroyed and another created in one update can: the store's grace period (below) absorbs that.
- **Cost:** one header read per `On` and `Remove` when there's no watcher. These are the hottest paths in the framework, so phase 1 measures it before anything is built on it.

### A store watches a root

`ReadStore.Get(id)` reads property `id` of the root's wrapper, which touches that property's basic scope (`GetPropertyScope`). Its emitter is where a reader of the root attaches, so it's where a store watches the root:

```ts
// ObservableNode: the emitter a node's property reads attach to, created if it isn't yet
ObservableNode.WatchProperty(node, prop, watcher): () => void;
```

A store with `demand` patterns calls it for a matching root when it creates the root's node: in `Get`, for a root it doesn't hold yet (the node it creates there holds the default value), and in `UpdateRootObject`, for a root a post delivers.

- **Only reactive reads count.** A read outside a watch (a `Peek`, `ObservableNode.Snapshot`, an unwrapped value) registers no emitter, so it neither subscribes a root nor keeps it. Code that reads outside a scope holds the root explicitly (`Hold`, below).
- **Reading through a key counts.** The store's alias function touches the referenced root's scope, so a value that refers to another root by key keeps that root too. A demand root it refers to that hasn't arrived yet reads as undefined, instead of throwing `No root object found for key` as it does now.

### Demand subscriptions

```ts
export interface IStoreAsyncOptions extends IStoreOptions {
  roots?: readonly string[];
  /** Root keys received while read: exact keys and patterns ending in `*` */
  demand?: readonly string[];
  /** How long a root no one reads stays subscribed, in ms; default 1000 */
  demandDebounce?: number;
}
```

- **The roots a store receives are its `roots` plus the demand roots it holds.** The `roots` subscription is as today; a demand root isn't in it. A key that matches both is a `roots` root.
- **One subscription per demand root**, on the store's channel, through a `ChannelSubscription` of its own. It holds the key in the host's `SubscriptionManager` like any exact subscription, so `SubscriberCount` and `OnReleased` see it.
- **Watched, subscribed at the next microtask.** The watcher only marks the key; a flush subscribes every key watched and not yet subscribed, so a key read and dropped in the same update is never subscribed. The first post brings the key's committed state; until it arrives, the root reads as its default.
- **Released after the grace period.** When a key's last reader goes, a timer starts; when it fires and the key is still unread, the store unsubscribes and deletes the root locally. A reader that comes back first cancels it. Deleting the root, rather than keeping it, means a later reader never sees a run's results that are out of date; a reader that comes back after the release waits for the first post again.
- **A post for a released key is dropped.** An unsubscribe and a commit can cross on the channel; the store applies a demand subscription's posts only while it holds that key.
- **`Hold(key)`** holds a demand root without reading it reactively, for code that reads it outside a scope (an export, a one-off walk): it returns a release function, and `Once`-style waiting for the first post is the caller's (`store.Get` inside a scope, or a promise the store offers later if needed).
- **A restarted worker** (`Restarted`) reconnects every demand subscription on the new port, as it does the `roots` one. Each `ChannelSubscription` deletes the roots the new tree lacks, as now.
- **Writes are as today.** A store may write a demand root it doesn't hold; it's written and not read back, like a root outside `roots`.

### What a host can do with it

Nothing is required. A tree that builds what it publishes can stop maintaining an entity nobody holds, with what exists: `OnReleased("type:*", key => …)` when the last holder goes, and `SubscriberCount(key)` before rebuilding one. Whether to skip work for unheld keys is the app's choice; the store doesn't depend on it.

## builder-app

What changes to use it, for the engine's results:

- **The worker publishes per-entity roots** instead of whole parts: `type:<objectType>`, `procedure:<objectType>:<procedureType>`, `slice:<name>`, `router:<…>`, beside `counts`, `revision`, `run` and the fact issues. Today `objectTypes` is one array root of every type's summary, posted as an array so a lost key doesn't replace the whole record; one root per type removes that concern. The trace and schema workers follow with patterns, worker to worker, and are unaffected.
- **The main thread's result store** takes `roots: ["counts", "revision", "run", "factIssues"]` and `demand` for the per-entity patterns.
- **Readers read one entity's root.** Cards and overviews already read `counts` (`EngineService.live`). The data sheet, the inspectors and the Run panel read the root of the entity they show. The few that walk a whole part (outcome groups, the Run panel's lists, some checks) get a rollup in `counts` or `Hold`. `EngineService.index`, which snapshots whole parts, goes.

## Phases

1. **The emitter's watcher, measured.** `Emitter.Watch`; the transitions in `On`, `Remove` and `Clear`; tests for each `UpdateEmitters` strategy (a re-run that keeps the emitter doesn't fire), tombstones and compaction, and a destroy. A benchmark of `On` and `Remove` without a watcher, against today, on the scope-heavy cases (a list re-rendering, a mapped scope). Stop here if the cost shows.
2. **`ObservableNode.WatchProperty`** and the store's root watch, with `StoreSync` tests: a root's first reactive read and the destroy of its last reader each fire once; a peek fires nothing; an alias read counts.
3. **`StoreAsync` demand subscriptions**: the flush, the grace period, the delete, `Hold`, dropped posts for released keys, the alias read of an undelivered root, restart. Tests over `hostPublisher-test-async`'s worker shim.
4. **builder-app**: the engine worker's per-entity roots, the result store's `demand`, the readers. Measured as above: the main thread's long tasks after an import, after a load, and after one edit.

## Open questions

1. **The default grace period.** A timer is predictable; the next idle callback is shorter but may never come during a long task. 1 s is a guess to measure against switching sheets and tabs.
2. **Batching subscribes.** A view that opens with 40 demand roots sends 40 `jt-subscribe` messages and receives 40 first posts. Fine for builder-app's numbers (entities, not objects); if it isn't, `jt-subscribe` could carry several subscriptions in one message, each still releasable alone.
3. **One post per commit.** A commit that touches 40 held roots posts 40 times, one per subscription. Structured clone is per message, so this costs little more than one post with everything; grouping a channel's deliveries into one post is a later optimisation, not part of this.
4. **`StoreSync` over a local tree** (`DiffTreeHub.OpenLocal`). The same option would work, with the subscribe at the flush; builder-app doesn't need it yet.
5. **A pending state.** A root that's subscribed and not yet delivered reads as its default, the same as a root that doesn't exist. builder-app tells them apart with `revision` today; `IsPending(root)` (diff-tree-push.md) would say it directly.
