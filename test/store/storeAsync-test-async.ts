import { describe, it, expect, afterEach } from "vitest";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { CreateShimDiffWorker, CreateShimWorker, Settle } from "./worker-shim";
import type { IRouteDefinitions } from "../../src/Store/Diff";
import { KeyFunc, routes } from "./projection-cases";

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

  /** A store over a shim worker, with projections only for the cases about them */
  function CreateStore(routes?: IRouteDefinitions) {
    const worker = CreateShimDiffWorker(KeyFunc, routes);
    const batches: any[][] = [];
    const postMessage = worker.postMessage.bind(worker);
    worker.postMessage = (data: any) => {
      data?.type === "jt-batch" && batches.push(data.calls);
      postMessage(data);
    };

    const store = new StoreAsync(worker, { keyFunc: KeyFunc });
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
      const { store } = CreateStore(routes);

      store.Write([{ _id: "a" }, { _id: "b" }], "items");
      await Within(store.Flush());

      expect(store.Get("$projection_total")).toBe(2);
      expect(store.Get("$projection_doubled")).toBe(4);
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
      const { store } = CreateStore(routes);

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
      const { store, batches } = CreateStore(routes);

      const write = store.Write([{ _id: "a" }], "items");
      const push = store.Push("items", { _id: "b" });
      const patch = store.Patch("items", [{ _id: "a" }, { _id: "b" }, { _id: "c" }]);
      const splice = store.Splice("items", 0, 1);
      await Within(Promise.all([write, push, patch, splice]));

      expect(batches.length).toBe(1);
      expect(batches[0].map((m: any) => m.method)).toEqual(["writepath", "pushpath", "patchpath", "splicepath"]);
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
      const { store } = CreateStore(routes);

      await store.Write([{ _id: "a" }], "items");
      const push = store.Push("items", { _id: "b" }, { _id: "c" });
      const splice = store.Splice("items", 0, 1);
      await Within(Promise.all([push, splice]));

      expect(store.Get<any>("items").toJSON()).toEqual([{ _id: "b" }, { _id: "c" }]);
      expect(store.Get("$projection_total")).toBe(2);
    });

    it("applies the projection update from a write followed by an unrelated one", async () => {
      const { store } = CreateStore(routes);

      const write = store.Write([{ _id: "a" }, { _id: "b" }], "items");
      const unrelated = store.Write({ value: 1 }, "other");
      await Within(Promise.all([write, unrelated]));
      await Within(store.Write({ value: 2 }, "other"));

      expect(store.Get("$projection_total")).toBe(2);
    });
  });

  describe("push", () => {
    function CreatePushed(routes?: IRouteDefinitions) {
      const shim = CreateShimWorker(KeyFunc, routes);
      const store = new StoreAsync(shim.worker, { keyFunc: KeyFunc });
      stores.push(store);
      return { ...shim, store };
    }

    it("applies a commit the worker makes on its own, with no batch", async () => {
      const { tree, store } = CreatePushed();
      tree.WritePath("status", "running");
      tree.Commit();
      await Settle();
      expect(store.Get("status")).toBe("running");
    });

    it("starts from the committed state when created after the tree has committed", async () => {
      const { tree, worker } = CreateShimWorker(KeyFunc);
      tree.WritePath("items", [{ _id: "a" }, { _id: "b" }]);
      tree.Commit();
      tree.WritePath("pending", 1);

      const store = new StoreAsync(worker, { keyFunc: KeyFunc });
      stores.push(store);
      await Settle();
      expect(store.Get<any>("items").toJSON()).toEqual([{ _id: "a" }, { _id: "b" }]);
      expect(store.Get("pending")).toBeUndefined();

      tree.Commit();
      await Settle();
      expect(store.Get("pending")).toBe(1);
    });

    it("a write's promise waits for its own ack, past a worker commit made while it was in flight", async () => {
      const { tree, store, scope } = CreatePushed();
      const write = store.Write({ value: 1 }, "a");
      tree.WritePath("status", "busy");
      tree.Commit();

      await Within(write);
      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get("status")).toBe("busy");
      const types = scope.sent.map((m: any) => m.type);
      expect(types.lastIndexOf("jt-post")).toBeLessThan(types.indexOf("jt-ack"));
    });

    it("a commit without projections posts the roots, and the next batch brings projections up to date", async () => {
      const { tree, store } = CreatePushed(routes);
      await store.Write([{ _id: "a" }], "items");
      expect(store.Get("$projection_total")).toBe(1);

      tree.PushPath("items", [{ _id: "b" }]);
      tree.Commit();
      await Settle();
      expect(store.Get<any>("items").toJSON().length).toBe(2);
      expect(store.Get("$projection_total")).toBe(1);

      await store.Write(1, "other");
      expect(store.Get("$projection_total")).toBe(2);
    });

    it("an empty batch is acknowledged", async () => {
      const { store, scope } = CreatePushed();
      await Within(store.Write(1, "a"));
      await Within(store.Write(1, "a"));
      expect(scope.sent.filter((m: any) => m.type === "jt-ack").length).toBe(2);
      expect(scope.sent.filter((m: any) => m.type === "jt-post").length).toBe(1);
    });

    it("Flush with nothing in flight resolves at once", async () => {
      const { store } = CreatePushed();
      let done = false;
      store.Flush().then(() => (done = true));
      await Promise.resolve();
      await Promise.resolve();
      expect(done).toBe(true);
    });

    it("a store with roots receives only those", async () => {
      const { worker, tree } = CreateShimWorker();
      const store = new StoreAsync(worker, { roots: ["a", "task_*"] });
      stores.push(store);
      tree.WritePath("a", 1);
      tree.WritePath("b", 1);
      tree.WritePath("task_1", 1);
      tree.Commit();
      await Settle();
      expect(store.Get("a")).toBe(1);
      expect(store.Get("task_1")).toBe(1);
      expect(store.Has("b")).toBe(false);
    });

    it("Destroy stops applying commits and leaves the worker running", async () => {
      const { tree, store, worker, scope } = CreatePushed();
      tree.WritePath("a", 1);
      tree.Commit();
      await Settle();
      store.Destroy();
      await Settle();
      expect(scope.sent.length).toBeGreaterThan(0);
      tree.WritePath("a", 2);
      tree.Commit();
      await Settle();
      expect(store.Get("a")).toBe(1);
      expect(worker.terminated).toBe(false);
      expect(tree.SubscriberCount("a")).toBe(0);
    });
  });

  describe("failure", () => {
    it("rejects the change that fails in the worker", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");

      await expect(Within(store.Splice("root", 0, 1))).rejects.toThrow(/not an array/);
    });

    it("rejects only the failed batch; later batches apply", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");
      await expect(Within(store.Splice("root", 0, 1))).rejects.toThrow(/not an array/);

      await Within(store.Write({ value: 1 }, "a"));
      await Within(store.Patch("root", { n: 1 }));
      await Within(store.Flush());
      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get<any>("root").n).toBe(1);
    });

    it("rejects every change in the failed batch, and applies the changes before the failure", async () => {
      const { store, batches } = CreateStore();
      await store.Write({ notArray: true }, "root");

      const before = store.Write({ value: 1 }, "a");
      const failing = store.Splice("root", 0, 1);
      const after = store.Write({ value: 2 }, "b");
      const results = await Within(Promise.allSettled([before, failing, after]));

      expect(batches.length).toBe(2);
      expect(results.map((r) => r.status)).toEqual(["rejected", "rejected", "rejected"]);
      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get("b")).toBeUndefined();
    });

    it("a Flush after a failed batch has settled resolves", async () => {
      const { store } = CreateStore();
      await store.Write({ notArray: true }, "root");
      await store.Splice("root", 0, 1).catch(() => {});
      await expect(Within(store.Flush())).resolves.toBeUndefined();
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
