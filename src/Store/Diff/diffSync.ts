import { JsonDiffResult } from "../../Utils/json";
import { DiffTree, IsRoutePath } from "./diffTree";
import { DiffSpliceResult, DiffTreeRoutes, IDiffTree, IDiffTreeProjector } from "./diffTree.types";


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
   * @param projector - Optional projection implementation, e.g. `SequentialProjector`
   * @param routes - Optional route patterns, each with the definition of its instances
   */
  constructor(keyFunc?: { (val: any): string }, projector?: IDiffTreeProjector, routes?: DiffTreeRoutes) {
    this.diffTree = new DiffTree(keyFunc, projector, routes);
  }

  /**
   * The write's own result followed by the projections'. A route write's own result describes
   * the instance, not root state, so only the projections' (including summaries) is returned.
   */
  private WithProjections(path: string, diff: JsonDiffResult) {
    const projectionDiff = this.diffTree.RunProjections();
    return IsRoutePath(path) ? projectionDiff : diff.concat(projectionDiff);
  }

  /**
   * Computes the diff between a new value and the current value at a path.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   */
  public DiffPath(path: string, value: any) {
    return this.WithProjections(path, this.diffTree.DiffPath(path, value));
  }

  public PatchPath(path: string, patch: any) {
    return this.WithProjections(path, this.diffTree.PatchPath(path, patch));
  }

  public PushPath(path: string, items: any[]): JsonDiffResult {
    return this.WithProjections(path, this.diffTree.PushPath(path, items));
  }

  /**
   * Deletes a route instance (see `DiffTree.DeleteRoute`).
   * @param path - The instance's route path
   * @returns The root changes: the slot's removal, and the projections that changed
   */
  public DeleteRoute(path: string): JsonDiffResult {
    this.diffTree.DeleteRoute(path);
    return this.diffTree.RunProjections();
  }

  /**
   * @throws For a route path: a splice result is applied to the store by root path, which a
   *   route path doesn't have.
   */
  public SplicePath(path: string, start: number, deleteCount: number | undefined, items: any[]): DiffSpliceResult {
    if (IsRoutePath(path))
      throw `Route path ${path} can't be spliced through DiffSync`;

    const spliceResult = this.diffTree.SplicePath(path, start, deleteCount, items);
    const projectionDiff = this.diffTree.RunProjections();
    spliceResult.diffResult = spliceResult.diffResult.concat(projectionDiff);
    return spliceResult;
  }
}
