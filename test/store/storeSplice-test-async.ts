import { vi } from "vitest";

// jsdom has no Worker. This shim stands in for the diff worker: it runs the DiffTree in
// this thread, and delivers messages asynchronously as structured-cloned copies, as a real
// worker does. It must be in place before diffWorker.ts loads, hence vi.hoisted.
const shim = vi.hoisted(() => {
  const state: { start: ((ctx: any) => void) | null } = { start: null };
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
      state.start!(this.ctx);
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
  return state;
});

import { JsonDiffFactory } from "../../src/Utils/json";
import { DiffTreeFactory } from "../../src/Store/Diff/diffTree";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, spliceCases } from "./splice-cases";

shim.start = (ctx) => DiffTreeFactory.call(ctx, JsonDiffFactory, true);

spliceCases("StoreAsync", () => new StoreAsync(KeyFunc));
