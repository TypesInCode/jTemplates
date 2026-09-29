import { DiffTree, DiffTreeProjectionMap } from "../../src/Store/Diff/diffTree";
import { ConnectWorkerToDiffTree } from "../../src/Store/Diff/diffTreeWorker";

// jsdom has no Worker, and a real worker entry module (like defaultDiffTreeWorker.ts) can
// only be built by a bundler. This shim plays that role for tests: it builds a DiffTree
// with the given keyFunc/projections baked in, in this thread, and connects it through
// ConnectWorkerToDiffTree to a fake Worker pair that delivers messages asynchronously as
// structured-cloned copies, as a real worker boundary would.

const clone = (v: unknown) => (v === undefined ? v : structuredClone(v));

/**
 * Creates a `Worker` handle backed by a same-thread `DiffTree`, for use with `DiffAsync` in
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
