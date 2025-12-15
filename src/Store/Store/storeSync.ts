import { JsonMerge, JsonDeepClone } from "../../Utils/json";
import { DiffSync } from "../Diff/diffSync";
import { GET_OBSERVABLE_VALUE } from "../Tree/observableNode";
import { Store } from "./store";

/**
 * StoreSync class extends the base Store class to provide synchronous data management operations.
 * This class handles writing, patching, pushing, and splicing data in a synchronous manner.
 * 
 * StoreSync is designed to work with observable data structures, allowing for efficient updates
 * and notifications when data changes. It is particularly useful for scenarios where synchronous
 * operations are preferred or required.
 * 
 * @example
 * // Creating a StoreSync instance
 * const store = new StoreSync();
 * 
 * // Writing data to the store
 * store.Write({ name: "John", age: 30 }, "user");
 * 
 * // Patching existing data
 * store.Patch("user", { age: 31 });
 * 
 * // Pushing data into an array
 * store.Push("user.array", { id: 1 }, { id: 2 });
 * 
 * // Splicing an array
 * const deletedItems = store.Splice("user.array", 0, 1, { id: 3 });
 * 
 * @see Store
 * @see StoreAsync
 * @see DiffSync
 */
export class StoreSync extends Store {
  /**
   * The diff instance used to compute differences between current and new data states.
   * @private
   */
  private diff: DiffSync;

  /**
   * Creates an instance of StoreSync.
   * @param keyFunc Optional function to generate a key for a given data value.
   */
  constructor(keyFunc?: (value: any) => string | undefined) {
    super(keyFunc);

    this.diff = new DiffSync(keyFunc);
  }

  /**
   * Writes data to the store synchronously.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @throws Will throw an error if no key is provided for the data.
   */
  Write(data: unknown, key?: string) {
    data = JsonDeepClone(data);
    key = key || this.keyFunc?.(data);

    if (!key) throw "No key provided for data";

    const diffResult = this.diff.DiffPath(key, data);

    this.UpdateRootMap(diffResult);
  }

  /**
   * Patches an existing value in the store with new data synchronously.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @throws Will throw an error if the value to be patched is undefined.
   */
  Patch(key: string, patch: unknown) {
    const value = this.Get(key);
    if (value === undefined) throw "Unable to patch undefined value";

    const json = (value as any).toJSON();
    const mergedJson = JsonMerge(json, patch);

    const diffResult = this.diff.DiffPath(key, mergedJson);
    this.UpdateRootMap(diffResult);
  }

  /**
   * Pushes data into an array stored at the specified key synchronously.
   * @param key The key of the array where data will be pushed.
   * @param data The data items to be pushed into the array.
   */
  Push(key: string, ...data: unknown[]) {
    const arr = this.Get(key) as any[];
    const batch = data.map(function (d, i) {
      return {
        path: `${key}.${arr.length + i}`,
        value: d,
      };
    });

    const diffResult = this.diff.DiffBatch(batch);
    this.UpdateRootMap(diffResult);
  }

  /**
   * Splices an array stored at the specified key with new data synchronously.
   * This method modifies the array by deleting elements and inserting new ones at the specified position.
   * @param key The key of the array to be spliced.
   * @param start The position at which to start changing the array.
   * @param deleteCount Optional number of elements to delete. If not provided, all elements from start to end will be deleted.
   * @param items Optional elements to insert into the array.
   * @returns The array of deleted elements.
   */
  Splice(
    key: string,
    start: number,
    deleteCount?: number,
    ...items: unknown[]
  ) {
    const arr = this.Get(key) as any[];
    const arrValue = (arr as any)[GET_OBSERVABLE_VALUE] as any[];
    const arrCopy = arrValue.slice();

    const spliceResult = JsonDeepClone(
      arrCopy.splice(start, deleteCount, ...items),
    );
    const diffResult = this.diff.DiffPath(key, arrCopy);
    this.UpdateRootMap(diffResult);
    return spliceResult;
  }
}
