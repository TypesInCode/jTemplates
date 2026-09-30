import { DiffSpliceResult, IDiffTree } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { JsonDiffResult } from "../../Utils/json";
import { IDiffMethod } from "./diffTreeWorker";

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
   * Creates a DiffAsync instance around an already-running worker.
   * @param diffWorker - A `Worker` running a `DiffTree` connected via
   *   `ConnectWorkerToDiffTree` (e.g. a bundled `defaultDiffTreeWorker` entry, or a custom
   *   entry file for a non-default `keyFunc`/`projections` baked into the worker thread).
   */
  constructor(diffWorker: Worker) {
    this.workerQueue = new WorkerQueue(diffWorker);
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
