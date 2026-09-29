import { JsonDiffFactory } from "../../src/Utils/json";
import { ArraysEqual } from "../../src/Utils/array";
import { DiffTreeFactory } from "../../src/Store/Diff/diffTree";

// jsdom has no Worker. This shim stands in for the Store's diff worker: it runs the
// DiffTree in this thread, and delivers messages asynchronously as structured-cloned
// copies, as a real worker does. diffWorker.ts checks for Worker when it loads, so import
// this before anything that imports StoreAsync.

const clone = (v: unknown) => (v === undefined ? v : structuredClone(v));

class ShimWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private readonly ctx: any;

  constructor() {
    const worker = this;
    this.ctx = {
      onmessage: null,
      postMessage(data: unknown) {
        const copy = clone(data);
        setTimeout(() => worker.onmessage?.({ data: copy }));
      },
    };
    DiffTreeFactory.call(this.ctx, JsonDiffFactory, ArraysEqual, true);
  }

  postMessage(data: unknown) {
    const copy = clone(data);
    setTimeout(() => {
      try {
        this.ctx.onmessage?.({ data: copy });
      } catch (err) {
        this.onerror?.(err);
      }
    });
  }

  terminate() {}
}

(globalThis as any).Worker = ShimWorker;
if (!URL.createObjectURL) URL.createObjectURL = () => "blob:diff-worker-shim";
