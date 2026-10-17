import { JsonDiffResult } from "../../Utils/json";
import { DiffTree } from "./diffTree";
import { DIFF_TREE_ERROR, DIFF_TREE_EVENT, DiffSpliceResult, DiffTreeProjectionMap, IDiffMethodBatchResult } from "./diffTree.types";

/**
 * A `DiffTree` that pushes its changes to a `PushStore` instead of answering a store's
 * requests. Use it inside a worker that produces data itself (for example, the result of a
 * computation it runs): write with the usual `DiffTree` methods, then call `Commit()` to run
 * projections and post everything since the last commit as one message.
 *
 * - Push only: don't pass a `DiffTreeWriter` to `ConnectWorkerToDiffTree`. It would record
 *   the request/response batches too and send them again on the next `Commit()`.
 * - After a change fails, every later change before `Commit()` throws that same error. The
 *   changes made before the failure are already in the tree, so `Commit()` still sends them,
 *   followed by a `DIFF_TREE_ERROR` message. Projections aren't run for that batch; the next
 *   `Commit()` brings them up to date.
 * - A `PushStore` only receives the changes committed after it starts listening, so
 *   create it before the writer's first `Commit()`.
 *
 * @example
 * // engine-worker.ts
 * const tree = new DiffTreeWriter(self, undefined, projections);
 * tree.DiffPath("results", computeResults());
 * tree.Commit();
 *
 * // main thread
 * const store = new PushStore(worker);
 *
 * @see PushStore
 */
export class DiffTreeWriter extends DiffTree {
  private uncommittedError: any = null;
  private uncommitted: IDiffMethodBatchResult = [];

  /**
   * Creates a DiffTreeWriter.
   * @param worker Where `Commit()` posts its messages: the worker's `self`, or a `MessagePort`.
   *   On the same thread as the store, anything whose `postMessage` dispatches a `"message"`
   *   event on the store's `EventTarget`; post copies, or construct the store with `cloneData`.
   * @param keyFunc Optional function to extract a key from objects. Pass the same key logic to
   *   the `PushStore` that receives the changes.
   * @param projections Optional map of derived-value projections, keyed by id. They run once
   *   per `Commit()`, after the batch's changes.
   */
  constructor(private worker: { postMessage(message: unknown): void }, keyFunc?: {(val: any): string}, projections?: DiffTreeProjectionMap) {
    super(keyFunc, projections);
  }

  /**
   * Not available on a DiffTreeWriter: `Commit()` runs projections once per batch, after its
   * changes. Running them earlier would push a projection result computed from part of a batch.
   * @throws Always.
   */
  public RunProjections(): JsonDiffResult {
    throw new Error("RunProjections is called during Commit()");
  }
  
  /**
   * Computes the diff between a new value and the current value at a path, and records it
   * for the next `Commit()`.
   * @param path - Dot-separated path to the value
   * @param value - The new value to compare
   * @returns Diff results showing changes
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public DiffPath(path: string, value: any): JsonDiffResult {
    if (this.uncommittedError)
      throw this.uncommittedError;
      
    try {
      const result = super.DiffPath(path, value);
      result.length > 0 && this.uncommitted.push({
        type: "diff",
        result
      });

      return result;
    }
    catch(err: any) {
      this.uncommittedError = err;
      throw err;
    }
  }
  
  /**
   * Merges a patch into the current value at a path, and records the diff for the next
   * `Commit()`.
   * @param path - Dot-separated path to the value
   * @param patch - The value to merge into the current value
   * @returns Diff results showing changes
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public PatchPath(path: string, patch: any): JsonDiffResult {
    if (this.uncommittedError)
      throw this.uncommittedError;

    try {
      const result = super.PatchPath(path, patch);
      result.length > 0 && this.uncommitted.push({
        type: "diff",
        result
      });

      return result;
    }
    catch(err: any) {
      this.uncommittedError = err;
      throw err;
    }
  }
  
  /**
   * Appends items to the array at a path, and records the diff for the next `Commit()`.
   * @param path - Dot-separated path to the array
   * @param items - The items to append
   * @returns Diff results showing changes
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public PushPath(path: string, items: unknown[]): JsonDiffResult {
    if (this.uncommittedError)
      throw this.uncommittedError;

    try {  
      const result = super.PushPath(path, items);
      result.length > 0 && this.uncommitted.push({
        type: "diff",
        result
      });

      return result;
    }
    catch(err: any) {
      this.uncommittedError = err;
      throw err;
    }
  }
  
  /**
   * Splices the array at a path, and records the splice for the next `Commit()`.
   * @param path - Dot-separated path to the array
   * @param start - The position at which to start changing the array
   * @param deleteCount - The number of elements to delete
   * @param items - The elements to insert
   * @returns The splice and its diff results
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public SplicePath(path: string, start: number, deleteCount: number, items: any[]): DiffSpliceResult<unknown> {
    if (this.uncommittedError)
      throw this.uncommittedError;

    try {
      const result = super.SplicePath(path, start, deleteCount, items);
      this.uncommitted.push({
        type: "splice",
        result
      });

      return result;
    }
    catch(err: any) {
      this.uncommittedError = err;
      throw err;
    }
  }

  /**
   * Runs projections and posts every change since the last commit as one `DIFF_TREE_EVENT`
   * message, which a `PushStore` applies as a unit. Posts nothing when nothing changed.
   *
   * If a change in the batch failed, projections are skipped, the applied changes are still
   * posted, and a `DIFF_TREE_ERROR` message follows with the error; `Commit()` itself doesn't
   * throw, since the failed change already did. If a projection throws, the batch's changes
   * and the error are posted the same way, then `Commit()` rethrows. Either way the next batch
   * starts clean.
   * @throws A projection's error.
   */
  public Commit() {
    try {
      const result = !this.uncommittedError ? super.RunProjections() : [];
      result.length > 0 && this.uncommitted.push({
        type: "diff",
        result
      });
    }
    catch(err: any) {
      this.uncommittedError = err;
      throw err;
    }
    finally {
      this.uncommitted.length > 0 && this.worker.postMessage({
        type: DIFF_TREE_EVENT,
        data: this.uncommitted
      });
    
      if (this.uncommittedError) {
        this.worker.postMessage({
          type: DIFF_TREE_ERROR,
          data: this.uncommittedError
        });
      }

      this.uncommitted = [];
      this.uncommittedError = null;
    }
  }
  
}
