import { DIFF_TREE_ERROR, DIFF_TREE_EVENT, IDiffPushEvent } from "../Diff/diffTree.types";
import { ObservableScope } from "../Tree/observableScope";
import { ReadStore } from "./store";

/**
 * A read-only store whose changes are pushed to it by a `DiffTreeWriter`. The writer decides
 * when data changes and pushes it with `Commit()`; this store applies each pushed batch as it
 * arrives, and readers update the same way they do for any other store.
 *
 * The source is any `EventTarget` that delivers the writer's messages as `"message"` events:
 * usually a `Worker` or a `MessagePort`, or a plain `EventTarget` when the writer runs on the
 * same thread. The store ignores any message that isn't a `DIFF_TREE_EVENT` or
 * `DIFF_TREE_ERROR`, so the source can carry other traffic too. It never takes over the
 * source's `onmessage` or terminates a worker; that stays with the source's owner. It doesn't
 * listen for the source's `"error"` events either: the writer's errors arrive as
 * `DIFF_TREE_ERROR` messages (see `Error`).
 *
 * Changes are diffs against the writer's tree, so create the store before the writer's
 * first `Commit()`. A store created later misses the earlier changes.
 *
 * @example
 * const worker = new Worker(new URL("./engine-worker.ts", import.meta.url), { type: "module" });
 * const store = new PushStore(worker);
 * store.Get<Results>("results");   // reactive; undefined until the first commit
 * store.Destroy();                 // stops listening; doesn't terminate the worker
 *
 * @see DiffTreeWriter
 * @see StoreAsync
 */
export class PushStore extends ReadStore {
  private error: any = null;
  private errorScope = ObservableScope.Basic(() => this.error);

  /**
   * The error the writer reported with its last commit, or null. Reactive. It's cleared when
   * a later commit's changes arrive, so it reflects the most recent push, not a stopped store:
   * the writer's later changes are still applied after an error.
   */
  get Error() {
    return ObservableScope.Value(this.errorScope);
  }


  private messageHandler = (event: Event) => {
    const messageData = (event as MessageEvent).data as IDiffPushEvent;
    if (messageData && messageData.type === DIFF_TREE_EVENT) {
      this.UpdateRootMap(messageData.data);

      if (this.error !== null) {
        this.error = null;
        ObservableScope.Update(this.errorScope);
      }
    }
    else if (messageData && messageData.type === DIFF_TREE_ERROR) {
      this.error = messageData.data;
      ObservableScope.Update(this.errorScope);
    }
  }

  /**
   * Creates a PushStore and starts listening to the source. A `MessagePort` is started for
   * you, since `addEventListener` doesn't start a port the way assigning `onmessage` does.
   * @param eventTarget The source of the `DiffTreeWriter`'s messages: a `Worker`, a
   *   `MessagePort`, or any `EventTarget` that dispatches them as `"message"` events.
   * @param keyFunc Optional function to generate a key for a given data value, used to
   *   resolve root objects. Pass the same key logic the `DiffTreeWriter` was constructed
   *   with, if any.
   */
  constructor(private eventTarget: EventTarget, keyFunc?: (value: any) => string | undefined) {
    super(keyFunc);

    eventTarget.addEventListener("message", this.messageHandler);
    (eventTarget as Partial<MessagePort>).start?.();
  }

  /**
   * Stops listening to the source and destroys the error scope. The source stays open (a
   * worker keeps running); closing or terminating it is up to its owner.
   */
  Destroy() {
    this.eventTarget.removeEventListener("message", this.messageHandler);
    ObservableScope.Destroy(this.errorScope);
  }
}
