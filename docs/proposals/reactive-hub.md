# Proposal: A Reactive Hub

Status: draft, for discussion. Not part of the hub-endpoint changes (`DiffTreeHub`, `DiffTreeEndpoint`, stores over leases); it builds on them. Written 2026-11-13.

## Summary

A `DiffTreeHub` already knows most of what an app wants to know about its trees: which run, where, what holds each one, when each starts and ends, and which follow which. None of it is readable today. An app that wants it wraps the hub (the sample app's `InstrumentedHub`) or tracks it again by hand (builder-app's `EngineService` keeps its own `loading` / `unavailable` / `error`).

This proposal makes the hub the framework's one place for reporting its own behaviour:

1. **The hub's state is a tree.** The hub keeps what it knows in an `ObservableDiffTree` on the main thread, under a reserved endpoint, read with a `StoreSync` like any other tree and followable by any other tree.
2. **Three levels of reporting.** Lifecycle and graph (what the hub knows now); stores (what each store knows, through its lease); and the trees' insides (what each tree knows, over a reporting message).
3. **Events** for tooling: a callback with every hub action, as it happens.
4. **Lease labels**, so what holds a tree reads as the code that holds it.

It's quality-of-life tooling, and also the immediate answer for UI that needs specific values about a tree's state: whether it's running, whether a store has its first state, whether a worker failed.

## Principle: framework facts, never domain facts

The hub reports what the framework knows: lifecycle, connections, delivery, errors. Domain status stays in each tree's own roots, written by the tree. "The trace is building" and "the engine's result is stale" are domain facts; "the trace worker is running, generation 3, and its store has its first state" is a framework fact.

*Use case:* builder-app's `EngineService.status` is `"loading" | "ready" | "running" | "stale" | "error"`. `"running"` and `"stale"` are the engine's own, and stay in its tree. `"loading"` (no first state yet) and part of `"error"` (the worker failed) are the hub's, and the service stops tracking them.

## 1. The hub's state as a tree

The hub owns an `ObservableDiffTree` and registers it under a reserved endpoint, `DiffTreeHub.Endpoint` (its name reserved, so `Register` refuses it). Reading it is what reading any tree on the main thread is:

```typescript
const status = new StoreSync(hub.OpenLocal(DiffTreeHub.Endpoint.name));
status.Get<ITreeStatus>("tree_engine");          // reactive
```

- **One root per tree** (`tree_<name>`), so a reader of one tree's state isn't notified by another's.
- **Writes are committed once per turn.** The hub writes its state as it acts and commits at the end of the turn (a microtask). Many leases opened in one tick are one commit. It also keeps the hub from writing to its own tree during that tree's delivery, which throws: a subscriber of the hub's state may open a lease.
- **The hub doesn't report on its own tree**, so reading its state changes nothing in it.

*Use case:* a status bar reads `tree_engine.state` and `tree_engine.error` through a `StoreSync`, and its readers keep their nodes across updates, as every store's do.

*Use case:* a worker tree follows the hub's state like any source (`remote(DiffTreeHub.Endpoint, ["tree_engine"])`) and clears a cache it keyed by the engine's `generation` when the engine restarts, with no message of its own.

*The alternative* is a reactive `ObservableNode` (what `InstrumentedHub` does). It's simpler, but no worker can follow it, and it's a second way to read state in an app that otherwise reads everything through stores.

## 2. Reporting, in three levels

### Level 1: lifecycle and graph

What the hub knows already. No protocol change. Per tree, in `tree_<name>`:

| Field | What it is |
| --- | --- |
| `name`, `sources` | From the endpoint |
| `kind` | `"worker"` or `"local"`; absent before the first start |
| `state` | `"idle"`, `"running"`, `"releasing"` (in its `releaseDebounce`), or `"failed"` |
| `generation` | Starts so far: a restart is a new generation |
| `startedAt` | When the current generation started |
| `holders` | The stores open on it (count, and labels: §4) and the running trees that follow it |
| `error` | The last error: a worker's `error` or `messageerror` event, or a factory that threw |

- `"failed"` means the worker reported an error. The hub doesn't restart it: restarting stays the app's decision.
- Listening for a worker's errors needs `addEventListener` on the worker. `IDiffTreeWorker` gains it as optional; a real `Worker` has it.

*Use cases:*
- **`state` / `kind`:** a debug panel lists every tree, where it runs and whether it's running (what the sample's Worker hub panel shows today through `InstrumentedHub`).
- **`generation`:** a view shows "engine restarted" for a moment when the generation moves, so a user who saw results reset knows why.
- **`holders`:** a developer chasing a worker that never ends sees which store still holds it.
- **`releasing`:** a tab shows its data is still warm while the tree's debounce runs, so switching back is instant.
- **`error`:** the app restarts a failed engine itself: `@Watch(self => self.status.Get("tree_engine")?.error) restart(error) { error && hub.Restart("engine"); }`.

### Level 2: stores, through their lease

Each store knows its own state, and its lease is the hub's object, so the store reports through it. Per store, under its tree's `holders`:

| Field | What it is |
| --- | --- |
| `hydrated` | The store has applied its tree's first state (and again after a restart) |
| `pending` | Changes sent and not yet acknowledged (`StoreAsync`) |
| `failed` | The last change that was rejected, and why |

A `StoreSync` on a tree on this thread is hydrated when its constructor returns, and never has pending changes.

*Use cases:*
- **`hydrated`:** a view renders "loading…" until its store has its first state, instead of a service tracking it ("the UI subscribes, never waits"). builder-app's engine `"loading"` comes from here.
- **`pending`:** a "saving…" indicator reads the project store's pending changes, and clears when the tree has acknowledged them.
- **`failed`:** a form shows that a write was rejected because the tree restarted under it ("engine restarted before this change was acknowledged"), rather than the change silently not appearing.

### Level 3: inside the tree

What only the tree knows. Needs a reporting message: the tree's host posts `jt-report` on its own channel, and the hub, which doesn't listen to its workers today, listens and writes what it hears into the tree's root. Reports are throttled (at most one per tree per turn, or per interval) and opt-in, set on the hub's constructor.

| Field | What it is |
| --- | --- |
| `seq` | The tree's last commit |
| `subscribers` | How many subscriptions it serves |
| `following` | Per source: connected, and whether its first state has arrived |
| `errors` | Failed batches, subscriber errors, an `onFollow` that threw |
| `warnings` | Framework misuse the tree can see (below) |

Warnings the tree can see and nothing reports today:
- a followed root that never appears in its source (a `remote(source, ["entries"])` on a source with no `entries`);
- a store's `roots` filter that leaves out the entity roots its `keyFunc` resolves to, so it reads undefined;
- a projection that reads a follow path no endpoint follows;
- a key held whole by a store but diffed by its tree (until the opaque path-copy change lands).

*Use cases:*
- **`seq`:** a test or a dev overlay checks that a derived tree has caught up with its source, by comparing commits.
- **`subscribers`:** a developer sees a tree serving 40 subscriptions where they expected 2, and finds the view that subscribes on every render.
- **`following`:** the trace tab shows "waiting for the engine" while its tree has no first state from the engine, instead of an empty view.
- **`errors`:** a batch that threw in a worker shows in the dev overlay with the tree's name, not only as one rejected promise somewhere.
- **`warnings`:** a misspelled root in `remote(...)` shows as a warning the first time the source commits without it, instead of as a projection that's always undefined.

## 3. Events

`hub.OnEvent(callback)` calls back for each hub action as it happens: register, start, stop, restart, lease opened, lease released, error, and at level 3 each report. It's for tooling, not UI; UI reads the state tree.

```typescript
const stop = hub.OnEvent(event => console.debug(`[hub] ${event.type} ${event.name}`, event));
```

- The app builds its own log from events, sized as it wants. A log root in the state tree can come later if UI needs one.
- A built-in console reporter (`DiffTreeHub.LogTo(console)`) is cheap to add.

*Use cases:*
- **Logging:** during development, every start and stop is logged with its cause ("trace ends: its last lease was released"), which explains a worker that keeps restarting.
- **Telemetry:** a production app counts restarts and worker errors per tree and sends them with its other metrics.
- **The sample's Worker hub panel:** its action log becomes a list built from events, and `InstrumentedHub` goes away.

## 4. Lease labels

`hub.Open(name, { label })` and `hub.OpenLocal(name, { label })` name what holds the lease. Optional; costs nothing when left out. Holders read as their labels, and events carry them.

```typescript
@Destroy() totals = new StoreAsync(this.hub.Open("totals", { label: "TotalsPanel" }));
```

*Use case:* the debug panel says the ledger is held by "TotalsPanel" and "the budget tree", instead of "1 main-thread lease", so the developer knows which component to close.

## Cost

- Levels 1 and 2 change at lifecycle rate (a start, a lease, a first state), always on. Their writes are batched per turn.
- Level 3 changes at commit rate, so it's opt-in and throttled. Off, the hub doesn't listen to its workers, and trees post nothing.
- Events cost a callback per action, and nothing without a listener.

## Decisions to make

1. **Read path:** the hub's state as a tree (recommended, §1), or an `ObservableNode`.
2. **First round:** levels 1 and 2 (no protocol change), with level 3's `jt-report` designed alongside so the state's shape has room for it. Recommended.
3. **Events:** `OnEvent` only (recommended), or a log root in the state tree as well.
4. **Lease labels:** yes (recommended) or no.
5. **The reserved endpoint's name**, and whether `OpenLocal` on it is how the app reads it or the hub offers `hub.State` (a `StoreSync` it keeps).
6. **What counts as an error for a tree on the main thread**, which has no `error` event: a throw in its host's handling, its `onFollow`, or its subscribers.
7. **Separating a store's lease from a follower's** in `holders`, or one list with a kind on each.

## What it replaces

- The sample app's `InstrumentedHub` (procedures-engine `sample-worker-stores/src/hub/instrumented-hub.ts`), which subclasses the hub, wraps every factory, and can't see a tree on the main thread end.
- Hand-tracked lifecycle status in services, such as builder-app's engine `"loading"` and `unavailable`.
- Ad-hoc logging of worker starts and stops.
