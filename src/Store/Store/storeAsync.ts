import { AsyncQueue } from "../../Utils/asyncQueue";
import { JsonDeepClone, JsonMerge } from "../../Utils/json";
import { DiffAsync } from "../Diff/diffAsync";
import { GET_OBSERVABLE_VALUE } from "../Tree/observableNode";
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
 * // Creating a StoreAsync instance
 * const store = new StoreAsync();
 * 
 * // Writing data to the store asynchronously
 * await store.Write({ name: "John", age: 30 }, "user");
 * 
 * // Patching existing data asynchronously
 * await store.Patch("user", { age: 31 });
 * 
 * // Pushing data into an array asynchronously
 * await store.Push("user.array", { id: 1 }, { id: 2 });
 * 
 * // Splicing an array asynchronously
 * const deletedItems = await store.Splice("user.array", 0, 1, { id: 3 });
 * 
 * // Cleaning up resources
 * store.Destroy();
 * 
 * @see Store
 * @see StoreSync
 * @see DiffAsync
 */
export class StoreAsync extends Store {
  /**
   * The diff instance used to compute differences between current and new data states asynchronously.
   * @private
   */
  private diff: DiffAsync;

  /**
   * The async queue instance used to manage asynchronous operations in a non-blocking manner.
   * @private
   */
  private queue = new AsyncQueue();

  /**
   * Creates an instance of StoreAsync.
   * @param keyFunc Optional function to generate a key for a given data value.
   */
  constructor(keyFunc?: (value: any) => string | undefined) {
    super(keyFunc);

    this.diff = new DiffAsync(keyFunc);
  }

  /**
   * Writes data to the store asynchronously.
   * This method ensures that write operations are queued and executed in a non-blocking manner.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @throws Will throw an error if no key is provided for the data.
   */
  async Write(data: unknown, key?: string) {
    await this.queue.Next(async () => {
      key = key || this.keyFunc?.(data);

      if (!key) throw "No key provided for data";

      const diffResult = await this.diff.DiffPath(key, data);
      this.UpdateRootMap(diffResult);
    });
  }

  /**
   * Patches an existing value in the store with new data asynchronously.
   * This method ensures that patch operations are queued and executed in a non-blocking manner.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @throws Will throw an error if the value to be patched is undefined.
   */
  async Patch(key: string, patch: unknown) {
    await this.queue.Next(async () => {
      const value = this.Get(key);
      if (value === undefined) throw "Unable to patch undefined value";

      const json = (value as any).toJSON();
      const mergedJson = JsonMerge(json, patch);

      const diffResult = await this.diff.DiffPath(key, mergedJson);
      this.UpdateRootMap(diffResult);
    });
  }

  /**
   * Pushes data into an array stored at the specified key asynchronously.
   * This method ensures that push operations are queued and executed in a non-blocking manner.
   * @param key The key of the array where data will be pushed.
   * @param data The data items to be pushed into the array.
   */
  async Push(key: string, ...data: unknown[]) {
    await this.queue.Next(async () => {
      const arr = this.Get(key) as any[];

      const batch = data.map(function (d, i) {
        return {
          path: `${key}.${arr.length + i}`,
          value: d,
        };
      });

      const diffResult = await this.diff.DiffBatch(batch);
      this.UpdateRootMap(diffResult);
    });
  }

  /**
   * Splices an array stored at the specified key with new data asynchronously.
   * This method ensures that splice operations are queued and executed in a non-blocking manner.
   * It modifies the array by deleting elements and inserting new ones at the specified position.
   * @param key The key of the array to be spliced.
   * @param start The position at which to start changing the array.
   * @param deleteCount Optional number of elements to delete. If not provided, all elements from start to end will be deleted.
   * @param items Optional elements to insert into the array.
   * @returns The array of deleted elements.
   */
  async Splice(
    key: string,
    start: number,
    deleteCount?: number,
    ...items: unknown[]
  ) {
    return await this.queue.Next(async () => {
      const arr = this.Get(key) as any[];
      const arrValue = (arr as any)[GET_OBSERVABLE_VALUE] as any[];
      const arrCopy = arrValue.slice();

      const spliceResult = JsonDeepClone(
        arrCopy.splice(start, deleteCount, ...items),
      );
      const diffResult = await this.diff.DiffPath(key, arrCopy);
      this.UpdateRootMap(diffResult);
      return spliceResult;
    });
  }

  /**
   * Destroys the StoreAsync instance, stopping the async queue and cleaning up the diff instance.
   * This method should be called when the instance is no longer needed to free up resources.
   */
  Destroy() {
    this.queue.Stop();
    this.diff.Destroy();
  }
}
