import { JsonDiffResult } from "../../Utils/json";
import { DiffTree } from "./diffTree";
import { DIFF_TREE_ERROR, DIFF_TREE_EVENT } from "./diffTree.types";
import { IKeyFunc, IRouteDefinitions } from "./utils/diffTree.types";

/**
 * A `DiffTree` that pushes its changes to a `PushStore` instead of answering a store's
 * requests. Use it inside a worker that produces data itself (for example, the result of a
 * computation it runs): write with the usual `DiffTree` methods, then call `Commit()` to run
 * projections and post everything since the last commit as one message.
 *
 * - Push only: don't pass a `DiffTreeWriter` to `ConnectWorkerToDiffTree`, which commits
 *   every batch itself and would post it to the wrong place.
 * - After a change fails, every later change before `Commit()` throws that same error. The
 *   changes made before the failure are already in the tree, so `Commit()` still sends them,
 *   followed by a `DIFF_TREE_ERROR` message. Projections aren't run for that batch; the next
 *   `Commit()` brings them up to date.
 * - A `PushStore` only receives the changes committed after it starts listening, so
 *   create it before the writer's first `Commit()`.
 *
 * @example
 * // engine-worker.ts
 * const tree = new DiffTreeWriter(self, undefined, { "/": { projections } });
 * tree.WritePath("results", computeResults());
 * tree.Commit();
 *
 * // main thread
 * const store = new PushStore(worker);
 *
 * @see PushStore
 */
export class DiffTreeWriter extends DiffTree {
  private uncommittedError: any = null;

  /**
   * Creates a DiffTreeWriter.
   * @param worker Where `Commit()` posts its messages: the worker's `self`, or a `MessagePort`.
   *   On the same thread as the store, anything whose `postMessage` dispatches a `"message"`
   *   event on the store's `EventTarget`. The store clones every value it applies, so it never
   *   shares objects with the writer's tree.
   * @param keyFunc Optional function to extract a key from objects. Pass the same key logic to
   *   the `PushStore` that receives the changes.
   * @param routes Optional route definitions. Projections run once per `Commit()`, after the
   *   batch's changes.
   */
  constructor(private worker: { postMessage(message: unknown): void }, keyFunc?: IKeyFunc, routes?: IRouteDefinitions) {
    super(keyFunc, routes);
  }

  /**
   * Not available on a DiffTreeWriter: `Commit()` runs projections once per batch, after its
   * changes. Running them earlier would push a projection result computed from part of a batch.
   * @throws Always.
   */
  public RunProjections(): void {
    throw new Error("RunProjections is called during Commit()");
  }

  /**
   * Writes a value at a path.
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public WritePath(path: string, value: any) {
    this.Guard(() => super.WritePath(path, value));
  }

  /**
   * Merges a patch into the current value at a path.
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public PatchPath(path: string, patch: any) {
    this.Guard(() => super.PatchPath(path, patch));
  }

  /**
   * Appends items to the array at a path.
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public PushPath(path: string, items: unknown[]) {
    this.Guard(() => super.PushPath(path, items));
  }

  /**
   * Splices the array at a path.
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public SplicePath(path: string, start: number, deleteCount: number, items: any[]) {
    this.Guard(() => super.SplicePath(path, start, deleteCount, items));
  }

  /**
   * Deletes a route, its child routes and its route instances.
   * @throws The change's error, or an earlier uncommitted change's error.
   */
  public DeleteRoute(routePath: string) {
    this.Guard(() => super.DeleteRoute(routePath));
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
   * @returns The diff that was posted.
   * @throws A projection's error.
   */
  public Commit(): JsonDiffResult {
    let diff: JsonDiffResult = [];
    try {
      !this.uncommittedError && super.RunProjections();
    }
    catch (err: any) {
      this.uncommittedError = err;
      throw err;
    }
    finally {
      diff = super.Commit();
      diff.length > 0 && this.worker.postMessage({
        type: DIFF_TREE_EVENT,
        data: diff
      });

      if (this.uncommittedError) {
        this.worker.postMessage({
          type: DIFF_TREE_ERROR,
          data: this.uncommittedError
        });
      }

      this.uncommittedError = null;
    }

    return diff;
  }

  private Guard(change: () => void) {
    if (this.uncommittedError)
      throw this.uncommittedError;

    try {
      change();
    }
    catch (err: any) {
      this.uncommittedError = err;
      throw err;
    }
  }
}
