import { DiffTree } from "../Diff/diffTree";
import { IRouteDefinitions } from "../Diff/utils/diffTree.types";
import { IStoreOptions, Store } from "./store";

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
 * store.Splice("user.array", 0, 1, { id: 3 });
 *
 * @see Store
 * @see StoreAsync
 * @see DiffTree
 */
export class StoreSync extends Store {
  /**
   * The tree each change is applied to. Its `Commit()` diff keeps the store in sync.
   * @private
   */
  private diff: DiffTree;

  /**
   * Creates an instance of StoreSync.
   * @param keyFunc Optional function to generate a key for a given data value.
   * @param routes Optional route definitions. A projection in the root route (`"/"`) is
   * readable through `Get` at `$projection_<key>`.
   * @param options Optional settings; `opaque` lists the root keys held whole (`IStoreOptions`).
   * @throws When projections depend on each other in a cycle.
   */
  constructor(keyFunc?: (value: any) => string | undefined, routes?: IRouteDefinitions, options: IStoreOptions = {}) {
    super(keyFunc, options.opaque);

    this.diff = new DiffTree(keyFunc, routes);
    options.opaque && this.diff.MarkOpaque(options.opaque);
  }

  /**
   * Writes data to the store synchronously.
   * @param data The data to be written. Can be of any type.
   * @param key Optional key for the data. If not provided, the keyFunc will be used to generate a key.
   * @throws Will throw an error if no key is provided for the data.
   */
  Write(data: unknown, key?: string) {
    key = key || this.keyFunc?.(data);
    if (!key) throw "No key provided for data";

    this.diff.WritePath(key, data);
    this.Sync();
  }

  /**
   * Patches an existing value in the store with new data synchronously.
   * @param key The key of the value to be patched.
   * @param patch The patch data to be merged with the existing value.
   * @throws Will throw an error if the value to be patched is undefined.
   */
  Patch(key: string, patch: unknown) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.PatchPath(key, patch);
    this.Sync();
  }

  /**
   * Pushes data into an array stored at the specified key synchronously.
   * @param key The key of the array where data will be pushed.
   * @param data The data items to be pushed into the array.
   */
  Push(key: string, ...data: unknown[]) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.PushPath(key, data);
    this.Sync();
  }

  /**
   * Splices an array stored at the specified key with new data synchronously.
   * This method modifies the array by deleting elements and inserting new ones at the specified position.
   * @param key The key of the array to be spliced.
   * @param start The position at which to start changing the array.
   * @param deleteCount Optional number of elements to delete. If not provided, all elements from start to end will be deleted.
   * @param items Optional elements to insert into the array.
   */
  Splice(
    key: string,
    start: number,
    deleteCount?: number,
    ...items: unknown[]
  ) {
    if (!this.HasRootOf(key))
      throw "Key not found in store";

    this.diff.SplicePath(key, start, deleteCount ?? Infinity, items);
    this.Sync();
  }

  /**
   * Runs projections and applies everything changed since the last sync to the store.
   * @private
   */
  private Sync() {
    this.diff.RunProjections();
    this.UpdateRootMap(this.diff.Commit());
  }
}
