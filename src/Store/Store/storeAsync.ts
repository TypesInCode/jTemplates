import { AsyncQueue } from "../../Utils/asyncQueue";
import { DiffSpliceResult } from "../Diff/diffTree";
import { IDiffMethod, IDiffMethodBatch, IDiffMethodBatchResult } from "../Diff/diffTreeWorker";
import { WorkerQueue } from "../Diff/workerQueue";
import { Store } from "./store";

/**
 * StoreAsync class extends the base Store class to provide asynchronous data management operations.
 * This class handles writing, patching, pushing, and splicing data in an asynchronous manner.
 *
 * StoreAsync is designed to work with observable data structures, allowing for efficient updates
 * and notifications when data changes. It is particularly useful for scenarios where asynchronous
 * operations are preferred or required, such as handling large datasets or performing complex diffs
 * without blocking the main thread.
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
 * const deletedItems = await store.Splice("users", 0, 1, { id: 3 });
 *
 * // Cleaning up resources
 * store.Destroy();
 *
 * @see Store
 * @see StoreSync
 */
export class StoreAsync extends Store {
  private writeKeySet = new Set<string>();
  private workerQueue: WorkerQueue<IDiffMethodBatch, IDiffMethodBatchResult>;
  private asyncQueue: AsyncQueue;
  private currentBatch: IDiffMethodBatch = [];
  private currentBatchPromise: Promise<IDiffMethodBatchResult> = Promise.resolve([]);

  /**
   * Creates an instance of StoreAsync.
   * @param diffWorker A `Worker` running a `DiffTree` connected via `ConnectWorkerToDiffTree`
   *   (e.g. a bundled `defaultDiffTreeWorker` entry). Any `keyFunc`/projections the diff needs
   *   must be baked into that worker's own entry file.
   * @param keyFunc Optional function to generate a key for a given data value, used locally by
   *   this store to resolve root objects. Pass the same key logic the worker's `DiffTree` was
   *   constructed with, if any.
   */
  constructor(diffWorker: Worker, keyFunc?: (value: any) => string | undefined) {
    super(keyFunc, false);
    this.workerQueue = new WorkerQueue(diffWorker);
    this.asyncQueue = new AsyncQueue(true);
  }

  private async Schedule(method: IDiffMethod) {
    if (this.currentBatch.length === 0) {
      const batch = this.currentBatch;
      this.currentBatchPromise = this.asyncQueue.Next(async () => {
        await Promise.resolve();
        if (batch === this.currentBatch)
          this.currentBatch = [];

        const results = await this.workerQueue.Push(batch);

        for (let x = 0; x < results.length; x++) {
          const result = results[x];
          switch (result.type) {
            case "diff": {
              this.UpdateRootMap(result.result);
              break;
            }
            case "splice": {
              const spliceResult = result.result;
              this.UpdateRootMap(spliceResult.diffResult);
              this.SpliceRootObject(spliceResult.path[0], spliceResult.start, spliceResult.deleteCount, spliceResult.items);
              break;
            }
          }
        }

        return results;
      });
    }

    const batchIndex = this.currentBatch.length;
    this.currentBatch.push(method);

    const batchResult = await this.currentBatchPromise;
    return batchResult[batchIndex].result;
  }

  /**
   * Writes data to the store asynchronously.
   * Changes made in the same tick are sent to the worker together as one batch and applied in
   * the order they were made. A change to this key may be made before the returned promise
   * resolves; it's applied after this write.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @returns A promise that resolves once the write has been applied to the store.
   * @throws Will throw an error if no key is provided for the data, or reject with the original
   *   error if an earlier change failed.
   */
  async Write(data: unknown, key?: string): Promise<void> {
    key = key || this.keyFunc?.(data);
    if (!key)
      throw new Error("No key provided for data");

    this.writeKeySet.add(key);

    await this.Schedule({
      method: "diffpath",
      arguments: [key, data]
    });

    this.writeKeySet.delete(key);
  }

  /**
   * Patches an existing value in the store with new data asynchronously.
   * The patch is merged with the current value in the worker, so it applies on top of any
   * change made before it, including ones not yet applied to the store.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @returns A promise that resolves once the patch has been applied to the store.
   * @throws Will throw if the key isn't in the store and has no pending Write, or reject with
   *   the original error if an earlier change failed.
   */
  async Patch(key: string, patch: unknown): Promise<void> {
    if (!this.Has(key) && !this.writeKeySet.has(key))
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
   *   the original error if an earlier change failed.
   */
  async Push(key: string, ...data: unknown[]): Promise<void> {
    if (!this.Has(key) && !this.writeKeySet.has(key))
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
   * @returns A promise that resolves to the array of deleted elements once the splice has been
   *   applied to the store.
   * @throws Will throw if the key isn't in the store and has no pending Write, or reject with
   *   the original error if an earlier change failed.
   */
  async Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]): Promise<any[]> {
    if (!this.Has(key) && !this.writeKeySet.has(key))
      throw "Key not found in store";

    const spliceResult = await this.Schedule({
      method: "splicepath",
      arguments: [key, start, deleteCount, items]
    }) as DiffSpliceResult;

    return spliceResult.spliceResult;
  }

  /**
   * Returns a promise that resolves once every change made before this call has been applied
   * to the store. Changes made after this call are sent in a later batch, so they aren't
   * waited for and haven't been applied when the promise resolves.
   * @throws Rejects with the original error if a change made before this call failed.
   */
  async Flush() {
    this.currentBatch = [];
    return this.asyncQueue.Flush();
  }

  /**
   * Destroys the StoreAsync instance, stopping the async queue and cleaning up the diff instance.
   * This method should be called when the instance is no longer needed to free up resources.
   */
  Destroy() {
    this.asyncQueue.Stop();
    this.workerQueue.Destroy();
  }
}
