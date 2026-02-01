import { DiffTreeFactory, IDiffMethod, IDiffTree } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { DiffWorker } from "./diffWorker";
import { JsonDiffResult } from "../../Utils/json";

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
  private workerQueue: WorkerQueue<IDiffMethod, JsonDiffResult>;

  /**
   * Creates a DiffAsync instance and initializes the worker.
   * @param keyFunc - Optional function to extract a key from objects
   */
  constructor(keyFunc?: { (val: any): string }) {
    this.workerQueue = new WorkerQueue(DiffWorker.Create());
    this.workerQueue.Push({
      method: "create",
      arguments: keyFunc ? [keyFunc.toString()] : [],
    });
  }

  /**
   * Computes the diff between a new value and the current value at a path asynchronously.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Promise that resolves to diff results showing changes
   */
  public async DiffPath(path: string, value: any) {
    return await this.workerQueue.Push({
      method: "diffpath",
      arguments: [path, value],
    });
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
    });
  }

  /**
   * Destroys the DiffAsync instance and terminates the worker.
   */
  public Destroy() {
    this.workerQueue.Destroy();
  }
}
