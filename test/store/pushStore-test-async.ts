import { describe, it, expect, afterEach, vi } from "vitest";
import { PushStore } from "../../src/Store/Store/pushStore";
import { DiffTreeWriter } from "../../src/Store/Diff/diffTreeWriter";
import { DIFF_TREE_ERROR, DIFF_TREE_EVENT } from "../../src/Store/Diff";
import type { DiffTreeProjectionMap } from "../../src/Store/Diff";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { CreateShimPushChannel } from "./worker-shim";

// PushStore fed by a DiffTreeWriter over a shim channel. The writer decides when data
// changes; the store only ever receives what a Commit() posts, one message per commit.

function KeyFunc(val: any) {
  return val._id;
}

const projections: DiffTreeProjectionMap = {
  total: { reads: ["items"], projection: (_keys, items: any[]) => items.length },
};

/** Resolves once every message posted so far has been delivered. */
const delivered = () => new Promise((resolve) => setTimeout(resolve));

describe("PushStore", () => {
  const stores: PushStore[] = [];
  afterEach(() => {
    stores.splice(0).forEach((s) => s.Destroy());
  });

  function Create(keyFunc?: (val: any) => string, projectionMap?: DiffTreeProjectionMap) {
    const { target, port, posted } = CreateShimPushChannel();
    const writer = new DiffTreeWriter(port, keyFunc, projectionMap);
    const store = new PushStore(target, keyFunc);
    stores.push(store);
    return { writer, store, target, posted };
  }

  describe("commits", () => {
    it("applies a commit's changes", async () => {
      const { writer, store } = Create();

      writer.DiffPath("a", { value: 1 });
      writer.Commit();
      await delivered();

      expect(store.Get<any>("a").value).toBe(1);
    });

    it("receives nothing until Commit", async () => {
      const { writer, store, posted } = Create();

      writer.DiffPath("a", { value: 1 });
      await delivered();

      expect(posted).toHaveLength(0);
      expect(store.Get("a")).toBeUndefined();
    });

    it("posts one message per commit, and none when nothing changed", async () => {
      const { writer, posted } = Create();

      writer.DiffPath("a", { value: 1 });
      writer.DiffPath("b", { value: 2 });
      writer.Commit();
      writer.Commit();
      writer.DiffPath("a", { value: 1 });
      writer.Commit();

      expect(posted).toHaveLength(1);
      expect(posted[0].type).toBe(DIFF_TREE_EVENT);
    });

    it("applies later commits as changes to what it holds", async () => {
      const { writer, store } = Create();
      writer.DiffPath("root", { a: 1, b: 2 });
      writer.Commit();
      await delivered();

      writer.PatchPath("root", { a: 3 });
      writer.Commit();
      await delivered();

      expect(store.Get<any>("root").toJSON()).toEqual({ a: 3, b: 2 });
    });

    it("applies pushes and splices", async () => {
      const { writer, store } = Create();
      writer.DiffPath("list", [1, 2, 3]);
      writer.Commit();
      await delivered();

      writer.SplicePath("list", 0, 1, []);
      writer.PushPath("list", [4]);
      writer.Commit();
      await delivered();

      expect(store.Get<any>("list").toJSON()).toEqual([2, 3, 4]);
    });
  });

  describe("projections", () => {
    it("receives projection results with the commit", async () => {
      const { writer, store } = Create(undefined, projections);

      writer.DiffPath("items", [1, 2]);
      writer.Commit();
      await delivered();
      expect(store.Get("$projection_total")).toBe(2);

      writer.PushPath("items", [3]);
      writer.Commit();
      await delivered();
      expect(store.Get("$projection_total")).toBe(3);
    });
  });

  describe("keyFunc", () => {
    it("resolves keyed entities through their own roots", async () => {
      const { writer, store } = Create(KeyFunc);

      writer.DiffPath("items", [{ _id: "a", value: 1 }]);
      writer.Commit();
      await delivered();
      expect(store.Get<any>("a").value).toBe(1);
      expect(store.Get<any>("items")[0].value).toBe(1);

      writer.PatchPath("a", { value: 2 });
      writer.Commit();
      await delivered();
      expect(store.Get<any>("items")[0].value).toBe(2);
    });
  });

  describe("reactivity", () => {
    it("wakes a reader when a commit changes what it read", async () => {
      const { writer, store } = Create();
      writer.DiffPath("a", { value: 1 });
      writer.Commit();
      await delivered();

      let runs = 0;
      const scope = ObservableScope.Create(() => {
        runs++;
        return store.Get<any>("a").value;
      });
      expect(ObservableScope.Value(scope)).toBe(1);

      writer.PatchPath("a", { value: 2 });
      writer.Commit();
      await delivered();

      expect(ObservableScope.Value(scope)).toBe(2);
      expect(runs).toBe(2);
      ObservableScope.Destroy(scope);
    });
  });

  describe("source", () => {
    it("ignores messages that aren't the writer's", async () => {
      const { target, store } = Create();

      target.dispatchEvent(new MessageEvent("message", { data: { type: "OTHER", data: [] } }));
      target.dispatchEvent(new MessageEvent("message", { data: "text" }));
      target.dispatchEvent(new MessageEvent("message", { data: null }));

      expect(store.Get("a")).toBeUndefined();
      expect(store.Error).toBeNull();
    });

    it("starts a MessagePort-like source", () => {
      const target = new EventTarget() as EventTarget & { start: () => void };
      target.start = vi.fn();

      stores.push(new PushStore(target));

      expect(target.start).toHaveBeenCalledOnce();
    });

    it("stops applying commits after Destroy", async () => {
      const { writer, store } = Create();

      store.Destroy();
      writer.DiffPath("a", { value: 1 });
      writer.Commit();
      await delivered();

      expect(store.Get("a")).toBeUndefined();
    });
  });

  describe("errors", () => {
    function FailBatch(writer: DiffTreeWriter) {
      writer.DiffPath("ok", { value: 1 });
      // Splicing a value that isn't an array fails in the tree.
      expect(() => writer.SplicePath("ok", 0, 1, [])).toThrow();
      // Later changes in the same batch throw the same error.
      expect(() => writer.DiffPath("later", { value: 2 })).toThrow();
      writer.Commit();
    }

    it("applies the changes made before a failure, then reports the error", async () => {
      const { writer, store, posted } = Create();

      FailBatch(writer);
      await delivered();

      expect(posted.map((m) => m.type)).toEqual([DIFF_TREE_EVENT, DIFF_TREE_ERROR]);
      expect(store.Get<any>("ok").value).toBe(1);
      expect(store.Get("later")).toBeUndefined();
      expect(store.Error).not.toBeNull();
    });

    it("clears the error when a later commit's changes arrive", async () => {
      const { writer, store } = Create();
      FailBatch(writer);
      await delivered();

      writer.DiffPath("next", { value: 3 });
      writer.Commit();
      await delivered();

      expect(store.Error).toBeNull();
      expect(store.Get<any>("next").value).toBe(3);
    });
  });
});
