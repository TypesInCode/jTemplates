import { DiffSpliceResult, DiffTree, DiffTreeProjectionMap, IDiffTree } from "./diffTree";


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
   * @param projections - Optional map of derived-value projections, keyed by id
   */
  constructor(keyFunc?: { (val: any): string }, projections?: DiffTreeProjectionMap) {
    this.diffTree = new DiffTree(keyFunc, projections);
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  public DiffPath(path: string, value: any, flatten = true) {
    return this.diffTree.DiffPath(path, value, flatten);
  }

  /**
   * Computes diffs for a batch of path/value pairs.
   * @param data - Array of objects with path and value properties
   * @returns Combined diff results
   */
  public DiffBatch(data: Array<{ path: string; value: any }>) {
    return this.diffTree.DiffBatch(data);
  }

  public SplicePath(path: string, start: number, deleteCount: number | undefined, items: any[], flatten?: boolean): DiffSpliceResult {
    return this.diffTree.SplicePath(path, start, deleteCount, items, flatten);
  }
}
