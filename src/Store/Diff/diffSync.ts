import { JsonDiffResult } from "../../Utils/json";
import { DiffSpliceResult, DiffTree, DiffTreeProjectionMap, IDiffTree } from "./diffTree";


/**
 * Synchronous diff implementation.
 * Computes diffs immediately without queuing or workers.
 *
 * @see StoreSync
 * @see StoreAsync
 */
export class DiffSync implements IDiffTree {
  private diffTree: DiffTree;

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
  public DiffPath(path: string, value: any) {
    const diff = this.diffTree.DiffPath(path, value);
    return diff.concat(this.diffTree.RunProjections());
  }

  public PatchPath(path: string, patch: any) {
    const diff = this.diffTree.PatchPath(path, patch);
    return diff.concat(this.diffTree.RunProjections());
  }

  public PushPath(path: string, items: any[]): JsonDiffResult {
    const diff = this.diffTree.PushPath(path, items);
    return diff.concat(this.diffTree.RunProjections());
  }

  public SplicePath(path: string, start: number, deleteCount: number | undefined, items: any[]): DiffSpliceResult {
    const spliceResult = this.diffTree.SplicePath(path, start, deleteCount, items);
    spliceResult.diffResult.push(...this.diffTree.RunProjections());
    return spliceResult;
  }
}
