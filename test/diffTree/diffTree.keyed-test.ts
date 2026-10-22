import { describe, expect, it } from "vitest";
import { DiffTree } from '../../src/Store/Diff/diffTree';

// Keyed values are stored at their key ("home") and embedded wherever they're written. Writes
// through an embedded slot reach the home value, and reads resolve embedded slots through it.
describe("DiffTree keyed values", () => {
  const keyFunc = (data: any) => data?.id;

  describe("key changes", () => {
    it("Writing a key field moves the value to the new key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("value.item.id", "F");

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 1 });
      expect(tree.Snapshot("value")).toEqual({ item: { id: "F", v: 1 } });
    });

    it("The old key is left alone", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("value.item.id", "F");

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 1 });
    });

    it("Replacing a keyed object with a different key writes the new key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("value.item", { id: "F", v: 2 });

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 2 });
      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 1 });
      expect(tree.Snapshot("value")).toEqual({ item: { id: "F", v: 2 } });
    });

    it("Replacing an array entry with a different key writes the new key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "E", v: 1 }]);
      tree.WritePath("items", [{ id: "F", v: 1 }]);

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 1 });
      expect(tree.Snapshot("items")).toEqual([{ id: "F", v: 1 }]);
    });

    it("Changing to a key that already exists overwrites it", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 }, other: { id: "F", v: 9 } });
      tree.WritePath("value.item.id", "F");

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 1 });
      expect(tree.Snapshot("value")).toEqual({ item: { id: "F", v: 1 }, other: { id: "F", v: 1 } });
    });

    it("Changing the key of a stale embedded value carries the home value's data", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("/E.v", 2);
      tree.WritePath("value.item.id", "F");

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 2 });
    });

    it("Removing a key leaves the home value alone", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("value.item.id", undefined);

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 1 });
      expect(tree.Snapshot("value")).toEqual({ item: { v: 1 } });
    });

    it("Key change in a route writes the new key in that route", () => {
      const tree = new DiffTree(keyFunc, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/value", { item: { id: "E", v: 1 } });
      tree.WritePath("/channel/1/value.item.id", "F");

      expect(tree.ReadPath("/channel/1/F")).toEqual({ id: "F", v: 1 });
      expect(tree.ReadPath("/F")).toBeUndefined();
    });
  });

  describe("stale embedded values", () => {
    it("Write through a stale embedded value keeps the home value's other data", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1, w: 1 } });
      tree.WritePath("/E.v", 2);
      tree.WritePath("value.item.w", 2);

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 2, w: 2 });
      expect(tree.Snapshot("value")).toEqual({ item: { id: "E", v: 2, w: 2 } });
    });

    it("Splice through a stale embedded array uses the home array", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1, 2, 3] });
      tree.WritePath("/E.list", [1, 2, 3, 4]);
      tree.SplicePath("value.list", 0, 1, []);

      expect(tree.ReadPath("/E.list")).toEqual([2, 3, 4]);
    });

    it("Splice through a stale embedded array uses the home array with complex types", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [{ val: 1 }, { val: 2 }, { val: 3 }] });
      tree.WritePath("/E.list", [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }]);
      tree.SplicePath("value.list", 0, 1, []);

      expect(tree.ReadPath("/E.list")).toEqual([{ val: 2 }, { val: 3 }, { val: 4 }]);
    });

    it("Push through a stale embedded array uses the home array", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1] });
      tree.WritePath("/E.list", [1, 2]);
      tree.PushPath("value.list", [3]);

      expect(tree.ReadPath("/E.list")).toEqual([1, 2, 3]);
    });
  });

  describe("moves", () => {
    it("Removing an array item in a keyed value updates the home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1, 2, 3, 4] });
      tree.WritePath("value.list", [1, 3, 4]);

      expect(tree.ReadPath("/E.list")).toEqual([1, 3, 4]);
    });

    it("Reordering an array in a keyed value updates the home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1, 2, 3] });
      tree.WritePath("value.list", [3, 1, 2]);

      expect(tree.ReadPath("/E.list")).toEqual([3, 1, 2]);
    });

    it("Reordering an array invalidates its snapshot", () => {
      const tree = new DiffTree();
      tree.WritePath("list", [1, 2, 3]);
      tree.Snapshot("list");
      tree.WritePath("list", [3, 1, 2]);

      expect(tree.Snapshot("list")).toEqual([3, 1, 2]);
    });
  });

  describe("existing keyed values in new slots", () => {
    it("Writing an existing keyed value into a new slot updates its home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("items", [{ id: "E", v: 2 }]);

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 2 });
      expect(tree.Snapshot("value")).toEqual({ item: { id: "E", v: 2 } });
    });

    it("Writing an existing keyed value into a new slot keeps unchanged snapshots", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1, meta: { a: 1 } } });
      const before = tree.Snapshot("/E");
      tree.WritePath("items", [{ id: "E", v: 2, meta: { a: 1 } }]);
      const after = tree.Snapshot("/E");

      expect(after).toEqual({ id: "E", v: 2, meta: { a: 1 } });
      expect(after.meta).toBe(before.meta);
    });

    it("The same key written twice in one write keeps the last value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "E", v: 1 }, { id: "E", v: 2 }]);

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 2 });
      expect(tree.Snapshot("items")).toEqual([{ id: "E", v: 2 }, { id: "E", v: 2 }]);
    });
  });

  describe("nested keyed values", () => {
    it("Keyed values nested in a new keyed value are written to their keys", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", child: { id: "F", v: 1 } });

      expect(tree.ReadPath("/E")).toEqual({ id: "E", child: { id: "F", v: 1 } });
      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 1 });
    });

    it("Existing keyed value nested in a new keyed value keeps unchanged snapshots", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("other", { id: "F", v: 1, meta: { a: 1 } });
      const before = tree.Snapshot("/F");
      tree.WritePath("value", { id: "E", child: { id: "F", v: 2, meta: { a: 1 } } });
      const after = tree.Snapshot("/F");

      expect(after).toEqual({ id: "F", v: 2, meta: { a: 1 } });
      expect(after.meta).toBe(before.meta);
    });

    it("Nested keyed value is compared against its home value, not the stale embedded copy", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", child: { id: "F", v: 1 } });
      tree.WritePath("/F.v", 2);
      // Matches /E's embedded F, but not /F
      tree.WritePath("other", { id: "E", child: { id: "F", v: 1 } });

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 1 });
    });

    it("Write inside a nested keyed value updates the nearest home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", child: { id: "F", v: 1 } });
      tree.WritePath("value.child.v", 2);

      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 2 });
      expect(tree.Snapshot("/E")).toEqual({ id: "E", child: { id: "F", v: 2 } });
    });
  });

  describe("snapshot invalidation", () => {
    it("Direct write to a home value keeps its unchanged snapshots", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1, meta: { a: 1 } } });
      const before = tree.Snapshot("/E");
      tree.WritePath("/E.v", 2);
      const after = tree.Snapshot("/E");

      expect(after).toEqual({ id: "E", v: 2, meta: { a: 1 } });
      expect(after.meta).toBe(before.meta);
    });

    it("Write through an embedded value keeps the home value's unchanged snapshots", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1, meta: { a: 1 } } });
      const before = tree.Snapshot("/E");
      tree.WritePath("value.item.v", 2);
      const after = tree.Snapshot("/E");

      expect(after).toEqual({ id: "E", v: 2, meta: { a: 1 } });
      expect(after.meta).toBe(before.meta);
    });

    it("Write to a keyed value doesn't rerun a projection reading an unchanged part of it", () => {
      let runs = 0;
      const tree = new DiffTree(keyFunc, {
        "/": { projections: { meta: { reads: ["E.meta"], projection: (meta: any) => (runs++, meta.a) } } }
      });
      tree.WritePath("value", { item: { id: "E", v: 1, meta: { a: 1 } } });
      tree.RunProjections();
      tree.WritePath("value.item.v", 2);
      tree.RunProjections();

      expect(runs).toEqual(1);
    });

    it("Commit returns only the changed paths of a keyed value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1, meta: { a: 1 } } });
      tree.Commit();
      tree.WritePath("value.item.v", 2);

      const diff = tree.Commit();
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(expect.arrayContaining([
        { type: "write", path: ["value", "item", "v"], value: 2 },
        { type: "write", path: ["E", "v"], value: 2 }
      ]));
    });
  });
});
