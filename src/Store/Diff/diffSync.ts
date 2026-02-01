import { JsonDiffFactory } from "../../Utils/json";
import { DiffTreeFactory, IDiffTree } from "./diffTree";

const diffCnstr = DiffTreeFactory(JsonDiffFactory);

/**
 * Synchronous diff implementation.
 * Computes diffs immediately without queuing or workers.
 *
 * @see StoreSync
 * @see DiffAsync
 */
export class DiffSync implements IDiffTree {
  private diffTree: IDiffTree;

  /**
   * Creates a DiffSync instance.
   * @param keyFunc - Optional function to extract a key from objects
   */
  constructor(keyFunc?: { (val: any): string }) {
    this.diffTree = new diffCnstr(keyFunc);
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  public DiffPath(path: string, value: any) {
    return this.diffTree.DiffPath(path, value);
  }

  /**
   * Computes diffs for a batch of path/value pairs.
   * @param data - Array of objects with path and value properties
   * @returns Combined diff results
   */
  public DiffBatch(data: Array<{ path: string; value: any }>) {
    return this.diffTree.DiffBatch(data);
  }
}
