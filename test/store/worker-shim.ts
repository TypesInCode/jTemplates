import { DiffTree } from "../../src/Store/Diff/diffTree";
import type { DiffTreeProjectionMap } from "../../src/Store/Diff";
import { ConnectWorkerToDiffTree } from "../../src/Store/Diff/diffTreeWorker";

// jsdom has no Worker, and a real worker entry module (like defaultDiffTreeWorker.ts) can
// only be built by a bundler. This shim plays that role for tests: it builds a DiffTree
// with the given keyFunc/projections baked in, in this thread, and connects it through
// ConnectWorkerToDiffTree to a fake Worker pair that delivers messages asynchronously as
// structured-cloned copies, as a real worker boundary would.

const clone = (v: unknown) => (v === undefined ? v : structuredClone(v));

/**
 * Creates a `Worker` handle backed by a same-thread `DiffTree`, for use with `StoreAsync` in
 * tests. Mirrors what a bundler-built worker entry file does, minus the actual thread.
 */
export function CreateShimDiffWorker(
  keyFunc?: (val: any) => string,
  projections?: DiffTreeProjectionMap,
): Worker {
  const mainSide: any = { onmessage: null, onerror: null };
  const workerSide: any = { onmessage: null, onerror: null };

  mainSide.postMessage = (data: unknown) => {
    const copy = clone(data);
    setTimeout(() => {
      try {
        workerSide.onmessage?.({ data: copy });
      } catch (err) {
        mainSide.onerror?.(err);
      }
    });
  };
  mainSide.terminate = () => {};

  workerSide.postMessage = (data: unknown) => {
    const copy = clone(data);
    setTimeout(() => {
      try {
        mainSide.onmessage?.({ data: copy });
      } catch (err) {
        mainSide.onerror?.(err);
      }
    });
  };

  const diffTree = new DiffTree(keyFunc, projections);
  ConnectWorkerToDiffTree(diffTree, workerSide as Worker);

  return mainSide as Worker;
}

/**
 * A one-way channel for `DiffTreeWriter` → `PushStore` tests. `port` is the writer's side;
 * `target` is the `EventTarget` the store listens to. Each message is delivered
 * asynchronously as a structured-cloned copy in a `"message"` event, as a real worker
 * boundary would. `posted` records every message sent, before delivery.
 */
export function CreateShimPushChannel() {
  const target = new EventTarget();
  const posted: any[] = [];
  const port = {
    postMessage(data: unknown) {
      posted.push(data);
      const copy = clone(data);
      setTimeout(() => target.dispatchEvent(new MessageEvent("message", { data: copy })));
    },
  };

  return { target, port, posted };
}
