import { describe, it, expect, afterEach } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { CreateShimDiffWorker } from "./worker-shim";
import { KeyFunc, projections } from "./projection-cases";

// StoreAsync over a shim worker. Writes started without awaiting are batched together;
// Flush is the barrier a caller awaits to see every change made before it applied to the
// store, projections included.

/** Rejects if `promise` hasn't settled within `ms`, so a stuck operation fails fast. */
function Within<T>(promise: Promise<T>, ms = 200) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`not settled within ${ms}ms`)), ms)),
  ]);
}

describe("Store Async Test", () => {
  const stores: StoreAsync[] = [];
  afterEach(() => {
    stores.splice(0).forEach((s) => s.Destroy());
  });

  function CreateStore() {
    const worker = CreateShimDiffWorker(KeyFunc, projections);
    const batches: any[][] = [];
    const postMessage = worker.postMessage.bind(worker);
    worker.postMessage = (data: any) => {
      batches.push(data);
      postMessage(data);
    };

    const store = new StoreAsync(worker, KeyFunc);
    stores.push(store);
    return { store, batches };
  }

  describe("Flush", () => {
    it("applies writes that weren't awaited", async () => {
      const { store } = CreateStore();

      store.Write({ value: 1 }, "a");
      store.Write({ value: 2 }, "b");
      await Within(store.Flush());

      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get<any>("b").value).toBe(2);
    });

    it("applies projection updates from writes that weren't awaited", async () => {
      const { store } = CreateStore();

      store.Write([{ _id: "a" }, { _id: "b" }], "items");
      await Within(store.Flush());

      expect(store.Get("$projection_total")).toBe(2);
      expect(store.Get("$projection_doubled")).toBe(4);
      expect(store.Get<any>("derived")).toEqual({ _id: "derived", count: 2 });
    });

    it("applies every kind of change made before it", async () => {
      const { store } = CreateStore();
      await store.Write({ n: 1 }, "root");
      await store.Write([1, 2, 3], "list");

      store.Patch("root", { n: 2 });
      store.Push("list", 4);
      store.Splice("list", 0, 1);
      await Within(store.Flush());

      expect(store.Get<any>("root").n).toBe(2);
      expect(store.Get<any>("list").toJSON()).toEqual([2, 3, 4]);
    });

    it("doesn't wait for, or apply, changes made after it", async () => {
      const { store, batches } = CreateStore();

      store.Write({ value: 1 }, "a");
      const flushed = store.Flush();
      const later = store.Write({ value: 2 }, "b");

      await Within(flushed);
      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get("b")).toBeUndefined();

      await Within(later);
      expect(store.Get<any>("b").value).toBe(2);
      expect(batches.length).toBe(2);
    });
  });

  describe("batching", () => {
    it("sends writes started in the same tick as one batch", async () => {
      const { store, batches } = CreateStore();

      await Within(Promise.all([
        store.Write({ value: 1 }, "a"),
        store.Write({ value: 2 }, "b"),
        store.Write({ value: 3 }, "c"),
      ]));

      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(3);
    });

    it("applies writes to the same key in call order", async () => {
      const { store } = CreateStore();

      await Within(Promise.all([
        store.Write({ value: 1 }, "a"),
        store.Write({ value: 2 }, "a"),
        store.Write({ value: 3 }, "a"),
      ]));

      expect(store.Get<any>("a").value).toBe(3);
    });

    it("applies projections from every batch when batches overlap", async () => {
      const { store } = CreateStore();

      const first = store.Write([{ _id: "a" }], "items");
      await Promise.resolve();
      await Promise.resolve();
      const second = store.Write([{ _id: "a" }, { _id: "b" }, { _id: "c" }], "items");
      await Within(Promise.all([first, second]));

      expect(store.Get("$projection_total")).toBe(3);
      expect(store.Get("$projection_doubled")).toBe(6);
    });

    // Has(key) is checked when a change is made, before an earlier un-awaited Write of that
    // key has been applied to the store, so StoreAsync also accepts a key with a Write in
    // flight. The worker applies changes in order, so the change can go in the same batch.
    it("accepts a change to a key whose Write hasn't been applied yet, in the same batch", async () => {
      const { store, batches } = CreateStore();

      const write = store.Write([{ _id: "a" }], "items");
      const push = store.Push("items", { _id: "b" });
      const patch = store.Patch("items", [{ _id: "a" }, { _id: "b" }, { _id: "c" }]);
      const splice = store.Splice("items", 0, 1);
      await Within(Promise.all([write, push, patch, splice]));

      expect(batches.length).toBe(1);
      expect(batches[0].map((m: any) => m.method)).toEqual(["diffpath", "pushpath", "patchpath", "splicepath"]);
      expect(store.Get<any>("items").toJSON()).toEqual([{ _id: "b" }, { _id: "c" }]);
      expect(store.Get("$projection_total")).toBe(2);
    });

    it("accepts a change to a key whose Write is in a batch already in flight", async () => {
      const { store, batches } = CreateStore();

      const write = store.Write([{ _id: "a" }], "items");
      while (batches.length === 0) await Promise.resolve();
      const push = store.Push("items", { _id: "b" });
      await Within(Promise.all([write, push]));

      expect(batches.length).toBe(2);
      expect(store.Get<any>("items").toJSON()).toEqual([{ _id: "a" }, { _id: "b" }]);
    });

    it("still rejects a change to a key that was never written", async () => {
      const { store } = CreateStore();

      store.Write([{ _id: "a" }], "items");
      await expect(Within(store.Push("other", 1))).rejects.toMatch(/not found/);
      await Within(store.Flush());
      await expect(Within(store.Push("other", 1))).rejects.toMatch(/not found/);
    });

    it("accepts a change to a key once its Write has been awaited", async () => {
      const { store } = CreateStore();

      await store.Write([{ _id: "a" }], "items");
      const push = store.Push("items", { _id: "b" }, { _id: "c" });
      const splice = store.Splice("items", 0, 1);
      await Within(Promise.all([push, splice]));

      expect(store.Get<any>("items").toJSON()).toEqual([{ _id: "b" }, { _id: "c" }]);
      expect(store.Get("$projection_total")).toBe(2);
    });

    it("applies the projection update from a write followed by an unrelated one", async () => {
      const { store } = CreateStore();

      const write = store.Write([{ _id: "a" }, { _id: "b" }], "items");
      const unrelated = store.Write({ value: 1 }, "other");
      await Within(Promise.all([write, unrelated]));
      await Within(store.Write({ value: 2 }, "other"));

      expect(store.Get("$projection_total")).toBe(2);
    });
  });

  describe("failure", () => {
    it("rejects the change that fails in the worker", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");

      await expect(Within(store.Splice("root", 0, 1))).rejects.toMatch(/not an array/);
    });

    it("rejects every later change with the original error", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");
      const error = await store.Splice("root", 0, 1).catch((err) => err);

      await expect(Within(store.Write({ value: 1 }, "a"))).rejects.toBe(error);
      await expect(Within(store.Patch("root", { n: 1 }))).rejects.toBe(error);
      await expect(Within(store.Push("root", 1))).rejects.toBe(error);
      await expect(Within(store.Flush())).rejects.toBe(error);
      expect(store.Get("a")).toBeUndefined();
    });

    it("rejects a Flush made while the failing change is still pending", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");

      const failing = store.Splice("root", 0, 1);
      const flushed = store.Flush();

      const error = await Within(failing).catch((err) => err);
      await expect(Within(flushed)).rejects.toBe(error);
    });

    it("rejects a Write with no key, without killing the store", async () => {
      const { store } = CreateStore();

      const error = await Within(store.Write({ value: 1 })).catch((err) => err);
      expect(String(error)).toMatch(/No key/);

      await Within(store.Write({ value: 1 }, "a"));
      expect(store.Get<any>("a").value).toBe(1);
    });

    it("rejects a change for a key that isn't in the store, without killing the store", async () => {
      const { store } = CreateStore();

      await expect(Within(store.Patch("missing", { n: 1 }))).rejects.toMatch(/not found/);
      await expect(Within(store.Push("missing", 1))).rejects.toMatch(/not found/);
      await expect(Within(store.Splice("missing", 0, 1))).rejects.toMatch(/not found/);

      await Within(store.Write({ value: 1 }, "a"));
      expect(store.Get<any>("a").value).toBe(1);
    });
  });
});
