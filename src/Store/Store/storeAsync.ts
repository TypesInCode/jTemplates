import { AsyncQueue } from "../../Utils/asyncQueue";
import { ChannelClient } from "../Diff/channelClient";
import { IChannel, IDiffMethod, IDiffMethodBatch } from "../Diff/diffTree.types";
import { IStoreOptions, RootOf, Store } from "./store";

/** Options for a `StoreAsync` */
export interface IStoreAsyncOptions extends IStoreOptions {
  /**
   * The root keys the store receives: exact keys and patterns ending in `*`. Omitted, every root.
   * A root the store writes but doesn't receive is written but never read back. With a
   * `keyFunc`, include the entity roots the received roots refer to.
   */
  roots?: readonly string[];
}

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
  private client: ChannelClient;
  private asyncQueue = new AsyncQueue();
  private currentBatch: IDiffMethodBatch = [];
  private currentBatchPromise: Promise<void> = Promise.resolve();
  /** Batches not yet acknowledged, for `Flush` */
  private inFlight = new Set<Promise<void>>();

  /**
   * Creates an instance of StoreAsync and subscribes to the tree.
   * @param channel A channel to a `DiffTreePublisher` served by `HostPublisher`: a `Worker`
   *   (e.g. a bundled `defaultDiffTreeWorker` entry) or a `MessagePort`. Any `keyFunc`/routes the
   *   tree needs are baked into the worker's own entry file. Other messages may share the channel.
   * @param keyFunc Optional function to generate a key for a given data value, used locally by
   *   this store to resolve root objects. Pass the same key logic the worker's tree was
   *   constructed with, if any.
   * @param options Optional settings: `opaque` lists the root keys held whole (`IStoreOptions`),
   *   sent to the tree before the store subscribes, and `roots` the roots it receives.
   */
  constructor(channel: IChannel, keyFunc?: (value: any) => string | undefined, options: IStoreAsyncOptions = {}) {
    super(keyFunc, options.opaque);
    this.client = new ChannelClient(channel);
    options.opaque && options.opaque.length > 0 && this.client.MarkOpaque(options.opaque);
    this.client.Subscribe({ roots: options.roots }, post => this.UpdateRootMap(post.diff));
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
   * The channel stays open: whoever created the worker terminates it.
   */
  Destroy() {
    this.asyncQueue.Stop();
    this.client.Destroy();
  }
}
