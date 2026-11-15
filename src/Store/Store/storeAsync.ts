import { AsyncQueue } from "../../Utils/asyncQueue";
import { EmitterEvent } from "../../Utils/emitter";
import { PatternMatches } from "../../Utils/pattern";
import { _queueMicrotask, _setTimeout } from "../../Utils/scheduling";
import { ChannelClient, ChannelSubscription } from "../Diff/channelClient";
import { IChannel, IDiffMethod, IDiffMethodBatch, IDiffPost, IWorkerLease } from "../Diff/diffTree.types";
import { IStoreOptions, RootOf, Store } from "./store";

/** Options for a `StoreAsync` */
export interface IStoreAsyncOptions extends IStoreOptions {
  /**
   * The root keys the store receives: exact keys and patterns ending in `*`. Omitted, every root.
   * A root the store writes but doesn't receive is written but never read back. With a
   * `keyFunc`, include the entity roots the received roots refer to.
   */
  roots?: readonly string[];
  /**
   * Root keys the store receives only while something reads them: exact keys and patterns ending
   * in `*`. A demand root is subscribed on its own once a reactive scope reads it with `Get` (or
   * `Hold` holds it), and released `demandDebounce` ms after its last reader goes: unsubscribed and
   * deleted from the store. Until its first post arrives it reads as its default. Needs `roots`:
   * a store that receives every root has none left to demand. A key `roots` names is a `roots` root.
   */
  demand?: readonly string[];
  /** How long a demand root no one reads stays subscribed, in ms; default 1000 */
  demandDebounce?: number;
}

/** How long a demand root no one reads stays subscribed, by default */
const DEMAND_GRACE = 1000;

/**
 * StoreAsync class extends the base Store class to provide asynchronous data management operations.
 * This class handles writing, patching, pushing, and splicing data in an asynchronous manner.
 *
 * The tree lives in a worker, served by a `HostPublisher`. The store subscribes on construction and
 * applies every commit the tree posts, whatever caused it: its own batches, other writers, or the
 * worker's own work. A store created after the tree has committed starts from its committed state.
 * Without writes it's a read-only view of the tree.
 *
 * - Changes made in one tick are sent as one batch, and at most one batch waits behind the one in
 *   flight. A change's promise resolves on its batch's `jt-ack`, which arrives after the commit's
 *   posts, so the change has been applied when it resolves.
 * - A failed batch rejects only its own changes; later batches carry on.
 *
 * **Demand roots** (`IStoreAsyncOptions.demand`) are received while they're read: the first reactive
 * read of one subscribes to it alone, and its first post brings the tree's state of it; a grace
 * period after the last reader goes, it's unsubscribed and deleted from the store. A read outside
 * a scope neither subscribes nor keeps one; `Hold` does, for code that reads it that way.
 *
 * **Over a lease** (`DiffTreeHub.Open`), the store takes its keyFunc from the lease's endpoint, owns
 * the lease, and releases it when it's destroyed. When the hub restarts the worker,
 * the store starts over with the new tree, as when it first subscribed: the tree is the source of
 * truth, nothing the store wrote is written back, and changes the old tree hadn't acknowledged are
 * rejected.
 *
 * @example
 * // A store over a hub's lease: it lives as long as the component that holds it
 * @Inject(DiffTreeHub) hub!: DiffTreeHub;
 * @Destroy() totals = new StoreAsync(this.hub.Open("totals"));
 *
 * @example
 * // Creating a StoreAsync instance from a bundler-built worker entry file
 * const worker = new Worker(new URL("./Store/Diff/defaultDiffTreeWorker.js", import.meta.url), { type: "module" });
 * const store = new StoreAsync(worker);
 *
 * // Writing data to the store asynchronously
 * await store.Write({ name: "John", age: 30 }, "user");
 *
 * // Patching existing data asynchronously
 * await store.Patch("user", { age: 31 });
 *
 * // Pushing data into an array asynchronously
 * await store.Write([], "users");
 * await store.Push("users", { id: 1 }, { id: 2 });
 *
 * // Splicing an array asynchronously
 * await store.Splice("users", 0, 1, { id: 3 });
 *
 * // Cleaning up resources: the store stops listening; the worker is its creator's to terminate
 * store.Destroy();
 * worker.terminate();
 *
 * @see Store
 * @see StoreSync
 */
export class StoreAsync extends Store {
  private writeKeySet = new Set<string>();
  private client!: ChannelClient;
  private options: IStoreAsyncOptions;
  /**
   * The store's subscription, kept across a restart of the lease's worker: a new tree's first state
   * deletes the roots the old one posted that it doesn't hold
   */
  private subscription: ChannelSubscription;
  /** The lease the store owns, when it was given one */
  private lease?: IWorkerLease;
  private stopLease?: () => void;
  private asyncQueue = new AsyncQueue();
  private currentBatch: IDiffMethodBatch = [];
  private currentBatchPromise: Promise<void> = Promise.resolve();
  /** Batches not yet acknowledged, for `Flush` */
  private inFlight = new Set<Promise<void>>();
  /** Demand roots a reactive scope reads now, from their watchers */
  private readonly demandRead = new Set<string>();
  /** `Hold`s, by demand root */
  private readonly demandHolds = new Map<string, number>();
  /** A subscription for each demand root the store holds */
  private readonly demandSubscriptions = new Map<string, ChannelSubscription>();
  /** The release timers of demand roots no one reads, by key */
  private readonly demandReleasing = new Map<string, number>();
  /** Demand roots whose readers or holds changed since the last flush */
  private readonly demandChanged = new Set<string>();
  private demandFlushQueued = false;
  private destroyed = false;

  /**
   * Creates an instance of StoreAsync and subscribes to the tree.
   * @param channel A channel to an `ObservableDiffTree` served by `HostPublisher`: a `Worker` (e.g. a
   *   bundled `defaultDiffTreeWorker` entry), a `MessagePort`, or a lease from `DiffTreeHub.Open`. Other
   *   messages may share the channel. Given a lease, the store owns it from then on and releases it
   *   when it's destroyed, and follows the worker across restarts. A lease on a tree on this thread
   *   (`DiffTreeHub.OpenLocal`) is for a `StoreSync`, and doesn't compile here.
   * @param options `keyFunc`, `roots` and `opaque` (`IStoreAsyncOptions`). `keyFunc` is for a plain
   *   channel: pass the key logic the worker's tree was built with. A lease's is the endpoint's.
   *   `opaque` is the store's own: the tree must write those keys whole too, from its config
   *   (`IObservableDiffTreeConfig.opaque`), so share them from a file both import.
   * @throws When `keyFunc` is given with a lease, whose endpoint has its own.
   */
  constructor(channel: IChannel | IWorkerLease, options: IStoreAsyncOptions = {}) {
    const lease = IsLease(channel) ? channel : undefined;
    if (lease && options.keyFunc)
      throw new Error(`StoreAsync: the endpoint ${lease.name} gives the store its keyFunc; leave it out of the options.`);
    if (options.demand && options.demand.length > 0 && !options.roots)
      throw new Error("StoreAsync: demand roots need roots: a store that receives every root has none left to demand.");

    const keyFunc = lease ? lease.endpoint.keyFunc : options.keyFunc;
    super(keyFunc, options.opaque, options.demand ?? [], (key: string, event: EmitterEvent) => this.DemandWatched(key, event));
    this.options = options;
    this.lease = lease;
    if (lease)
      this.stopLease = lease.OnPort(port => this.Restarted(port));

    this.subscription = new ChannelSubscription({ roots: options.roots }, (post: IDiffPost, first: boolean) => this.Apply(post, first));
    this.client = this.Connect(lease ? lease.port : channel as IChannel);
    this.subscription.Connect(this.client);
  }

  /**
   * The hub restarted the lease's worker: the store moves to the new tree's port, keeping its
   * readers, and starts over as when it first subscribed. The changes the old tree hadn't
   * acknowledged are rejected, not sent again, and nothing is written back: the new tree's first
   * state is diffed into the store's roots in place, with the roots the old tree posted that the
   * new one lacks deleted (`ChannelSubscription`).
   */
  private Restarted(port: MessagePort) {
    this.client.RejectBatches(new Error(`${this.lease!.name} restarted before this change was acknowledged.`));
    this.client.Destroy();
    this.client = this.Connect(port);
    this.subscription.Connect(this.client);
    for (const subscription of this.demandSubscriptions.values())
      subscription.Connect(this.client);
  }

  private Connect(channel: IChannel) {
    return new ChannelClient(channel);
  }

  /**
   * Holds a demand root without reading it reactively, for code that reads it outside a scope: the
   * store subscribes to it as for a reader, and keeps it until every hold is released. Its first
   * post arrives later; until then it reads as its default.
   * @returns What releases this hold; calling it again does nothing.
   * @throws When the key is neither a demand root nor one of the store's `roots`. A `roots` root is
   *   always received: its hold does nothing.
   */
  Hold(key: string): () => void {
    if (this.IsRootsKey(key))
      return () => {};
    if (!this.IsDemandKey(key))
      throw new Error(`StoreAsync: ${key} isn't a demand root or one of the store's roots.`);

    this.demandHolds.set(key, (this.demandHolds.get(key) ?? 0) + 1);
    this.DemandChanged(key);
    let held = true;
    return () => {
      if (!held)
        return;

      held = false;
      const holds = (this.demandHolds.get(key) ?? 1) - 1;
      holds > 0 ? this.demandHolds.set(key, holds) : this.demandHolds.delete(key);
      this.DemandChanged(key);
    };
  }

  private IsRootsKey(key: string) {
    return !this.options.roots || this.options.roots.some(pattern => PatternMatches(pattern, key));
  }

  private IsDemandKey(key: string) {
    return !this.IsRootsKey(key) && (this.options.demand ?? []).some(pattern => PatternMatches(pattern, key));
  }

  /**
   * A demand root's watcher: it gained its first reactive reader or lost its last. This runs inside
   * a scope's update, so it only records the change for the next flush.
   */
  private DemandWatched(key: string, event: EmitterEvent) {
    if (this.IsRootsKey(key))
      return;

    event === EmitterEvent.SUBSCRIBED ? this.demandRead.add(key) : this.demandRead.delete(key);
    this.DemandChanged(key);
  }

  private DemandChanged(key: string) {
    this.demandChanged.add(key);
    if (this.demandFlushQueued)
      return;

    this.demandFlushQueued = true;
    _queueMicrotask(() => this.FlushDemand());
  }

  /**
   * Subscribes the demand roots read or held now and not yet subscribed, and starts the release of
   * the ones no one reads or holds. A root read and dropped since the last flush is never subscribed.
   */
  private FlushDemand() {
    this.demandFlushQueued = false;
    if (this.destroyed)
      return;

    const keys = Array.from(this.demandChanged);
    this.demandChanged.clear();
    for (const key of keys) {
      if (this.IsDemanded(key)) {
        const timer = this.demandReleasing.get(key);
        if (timer !== undefined) {
          clearTimeout(timer);
          this.demandReleasing.delete(key);
        }

        !this.demandSubscriptions.has(key) && this.SubscribeDemand(key);
      }
      else if (this.demandSubscriptions.has(key) && !this.demandReleasing.has(key))
        this.ReleaseLater(key);
    }
  }

  private IsDemanded(key: string) {
    return this.demandRead.has(key) || this.demandHolds.has(key);
  }

  private SubscribeDemand(key: string) {
    // A post for a key released since is dropped: an unsubscribe and a commit can cross on the channel
    const subscription: ChannelSubscription = new ChannelSubscription(
      { roots: [key] },
      (post: IDiffPost, first: boolean) => this.demandSubscriptions.get(key) === subscription && this.Apply(post, first),
    );
    this.demandSubscriptions.set(key, subscription);
    subscription.Connect(this.client);
  }

  private ReleaseLater(key: string) {
    const grace = this.options.demandDebounce ?? DEMAND_GRACE;
    if (grace <= 0)
      return this.ReleaseDemand(key);

    let fired = false;
    const timer = _setTimeout(() => {
      fired = true;
      this.demandReleasing.delete(key);
      !this.destroyed && !this.IsDemanded(key) && this.ReleaseDemand(key);
    }, grace);
    // A timer that ran at once (synchronous scheduling) has nothing left to cancel
    !fired && this.demandReleasing.set(key, timer);
  }

  /** Unsubscribes a demand root and deletes it from the store, so no later reader sees it stale */
  private ReleaseDemand(key: string) {
    const subscription = this.demandSubscriptions.get(key);
    if (!subscription)
      return;

    this.demandSubscriptions.delete(key);
    subscription.Stop();
    this.Has(key) && this.UpdateRootMap([{ type: "delete", path: [key] }]);
  }

  /** Applies a post. A tree's first state is diffed into the roots in place, its deletes with it. */
  private Apply(post: IDiffPost, firstState: boolean) {
    firstState ? this.UpdateRootMapInPlace(post.diff) : this.UpdateRootMap(post.diff);
  }

  private async Schedule(method: IDiffMethod) {
    if (this.currentBatch.length === 0) {
      const batch = this.currentBatch;
      const sent = this.asyncQueue.Next(async () => {
        await Promise.resolve();
        if (batch === this.currentBatch)
          this.currentBatch = [];

        // The batch's commit is applied by the subscription, before its ack arrives
        await this.client.Batch(batch);
      });
      this.currentBatchPromise = sent;
      this.inFlight.add(sent);
      sent.then(() => this.inFlight.delete(sent), () => this.inFlight.delete(sent));
    }

    this.currentBatch.push(method);
    await this.currentBatchPromise;
  }

  /**
   * Writes data to the store asynchronously.
   * Changes made in the same tick are sent to the worker together as one batch and applied in
   * the order they were made. A change to this key may be made before the returned promise
   * resolves; it's applied after this write.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @returns A promise that resolves once the write has been applied to the store.
   * @throws Will throw an error if no key is provided for the data, or reject with the error of
   *   the batch it was sent in.
   */
  async Write(data: unknown, key?: string): Promise<void> {
    key = key || this.keyFunc?.(data);
    if (!key)
      throw new Error("No key provided for data");

    // Pending writes by root, so a change to a path in a root being written isn't refused
    this.writeKeySet.add(RootOf(key));

    await this.Schedule({
      method: "writepath",
      arguments: [key, data]
    });

    this.writeKeySet.delete(RootOf(key));
  }

  /**
   * Patches an existing value in the store with new data asynchronously.
   * The patch is merged with the current value in the worker, so it applies on top of any
   * change made before it, including ones not yet applied to the store.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @returns A promise that resolves once the patch has been applied to the store.
   * @throws Will throw if the key isn't in the store and has no pending Write, or reject with
   *   the error of the batch it was sent in.
   */
  async Patch(key: string, patch: unknown): Promise<void> {
    if (!this.HasRootOf(key) && !this.writeKeySet.has(RootOf(key)))
      throw "Key not found in store";

    await this.Schedule({
      method: "patchpath",
      arguments: [key, patch]
    });
  }

  /**
   * Pushes data into an array stored at the specified key asynchronously.
   * @param key The key of the array where data will be pushed.
   * @param data The data items to be pushed into the array.
   * @returns A promise that resolves once the items have been applied to the store.
   * @throws Will throw if the key isn't in the store and has no pending Write, or reject with
   *   the error of the batch it was sent in.
   */
  async Push(key: string, ...data: unknown[]): Promise<void> {
    if (!this.HasRootOf(key) && !this.writeKeySet.has(RootOf(key)))
      throw "Key not found in store";

    await this.Schedule({
      method: "pushpath",
      arguments: [key, data]
    });
  }

  /**
   * Splices an array stored at the specified key with new data asynchronously.
   * This method modifies the array by deleting elements and inserting new ones at the specified position.
   * @param key The key of the array to be spliced.
   * @param start The position at which to start changing the array.
   * @param deleteCount Optional number of elements to delete. If not provided, all elements from start to end will be deleted.
   * @param items Optional elements to insert into the array.
   * @returns A promise that resolves once the splice has been applied to the store.
   * @throws Will throw if the key isn't in the store and has no pending Write, or reject with
   *   the error of the batch it was sent in.
   */
  async Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): Promise<void> {
    if (!this.HasRootOf(key) && !this.writeKeySet.has(RootOf(key)))
      throw "Key not found in store";

    await this.Schedule({
      method: "splicepath",
      arguments: [key, start, deleteCount ?? Infinity, items]
    });
  }

  /**
   * Returns a promise that resolves once every change made before this call has been applied
   * to the store: when the last batch sent before it is acknowledged, and at once when none is in
   * flight. Changes made after this call are sent in a later batch, so they aren't waited for and
   * haven't been applied when the promise resolves.
   * @throws Rejects with the first error of the batches it waited for.
   */
  async Flush() {
    this.currentBatch = [];
    const pending = Array.from(this.inFlight);
    const results = await Promise.allSettled(pending);
    const failed = results.find(result => result.status === "rejected");
    if (failed)
      throw (failed as PromiseRejectedResult).reason;
  }

  /**
   * Unsubscribes and stops listening to the channel. Changes not yet acknowledged never settle.
   * Over a lease, the store then releases it: the last lease on a worker ends it. Over a channel, the
   * channel stays open: whoever created the worker terminates it.
   */
  Destroy() {
    this.destroyed = true;
    this.stopLease?.();
    this.asyncQueue.Stop();
    this.subscription.Stop();
    for (const subscription of this.demandSubscriptions.values())
      subscription.Stop();
    this.demandSubscriptions.clear();
    for (const timer of this.demandReleasing.values())
      clearTimeout(timer);
    this.demandReleasing.clear();
    this.client.Destroy();
    this.lease?.Release();
  }
}

function IsLease(channel: IChannel | IWorkerLease): channel is IWorkerLease {
  return typeof (channel as IWorkerLease).OnPort === "function";
}
