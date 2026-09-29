import { DiffSpliceResult, DiffTreeFactory, DiffTreeProjectionMap, DiffTreeSerializedProjectionMap, IDiffMethod, IDiffTree } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { DiffWorker } from "./diffWorker";
import { JsonDiffResult } from "../../Utils/json";

/**
 * Serializes a `DiffTreeProjectionMap` for the worker boundary: `reads` survives structured
 * clone as-is, and each `projection` function is serialized with `.toString()`, the same
 * mechanic used below for `keyFunc`.
 */
function SerializeProjections(projections: DiffTreeProjectionMap): DiffTreeSerializedProjectionMap {
  const serialized: DiffTreeSerializedProjectionMap = {};
  const ids = Object.keys(projections);
  for (let x = 0; x < ids.length; x++) {
    const id = ids[x];
    serialized[id] = {
      reads: projections[id].reads,
      projection: projections[id].projection.toString(),
    };
  }

  return serialized;
}

/**
 * Async version of IDiffTree interface with all methods returning promises.
 */
type IDiffTreeAsync = {
  [property in keyof IDiffTree]: (
    ...args: Parameters<IDiffTree[property]>
  ) => Promise<ReturnType<IDiffTree[property]>>;
};

/**
 * Asynchronous diff implementation using web workers.
 * Offloads diff computation to a worker to prevent blocking the main thread.
 *
 * @see StoreAsync
 * @see DiffSync
 */
export class DiffAsync implements IDiffTreeAsync {
  private workerQueue: WorkerQueue<IDiffMethod, JsonDiffResult | DiffSpliceResult>;

  /**
   * Creates a DiffAsync instance and initializes the worker.
   * @param keyFunc - Optional function to extract a key from objects
   * @param projections - Optional map of derived-value projections, keyed by id. Each
   *   projection's function is serialized with `.toString()` and `eval`'d back into a
   *   function in the worker, the same mechanic used for `keyFunc`.
   */
  constructor(keyFunc?: { (val: any): string }, projections?: DiffTreeProjectionMap) {
    this.workerQueue = new WorkerQueue(DiffWorker.Create());
    this.workerQueue.Push({
      method: "create",
      arguments: [
        keyFunc ? keyFunc.toString() : undefined,
        projections ? SerializeProjections(projections) : undefined,
      ],
    });
  }

  /**
   * Computes the diff between a new value and the current value at a path asynchronously.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Promise that resolves to diff results showing changes
   */
  public async DiffPath(path: string, value: any, flatten = true) {
    return await this.workerQueue.Push({
      method: "diffpath",
      arguments: [path, value, flatten],
    }) as JsonDiffResult;
  }

  /**
   * Computes diffs for a batch of path/value pairs asynchronously.
   * @param data - Array of objects with path and value properties
   * @returns Promise that resolves to combined diff results
   */
  public async DiffBatch(data: Array<{ path: string; value: any }>) {
    return await this.workerQueue.Push({
      method: "diffbatch",
      arguments: [data],
    }) as JsonDiffResult;
  }

  public async SplicePath(path: string, start: number, deleteCount: number, items: any[], flatten?: boolean): Promise<DiffSpliceResult<unknown>> {
    return await this.workerQueue.Push({
      method: "splicepath",
      arguments: [path, start, deleteCount, items, flatten]
    }) as DiffSpliceResult;
  }

  /**
   * Destroys the DiffAsync instance and terminates the worker.
   */
  public Destroy() {
    this.workerQueue.Destroy();
  }
}
