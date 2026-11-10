import { describe, expect, it } from "vitest";
import { DiffTree } from '../../src/Store/Diff/diffTree';
import { SPLICE_ACTION } from '../../src/Utils/json';

// Keyed values are stored at their key ("home"), and every other place one is written (a slot)
// holds the home object itself. Writes through a slot reach the home value, and reads through a
// slot read it.
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

    it("Changing the key through a slot carries the home value's current data", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", v: 1 } });
      tree.WritePath("/E.v", 2);
      tree.WritePath("value.item.id", "F");

      // The slot holds /E itself, so there's no stale copy: the new key gets /E's data
      expect(tree.ReadPath("/F")).toEqual({ id: "F", v: 2 });
      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 2 });
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

    it("Write through a stale embedded value missing a nested object updates the home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("arr", [{ id: "a" }, { id: "b" }]);
      tree.WritePath("a", { id: "a", inner: { n: 1 } });
      tree.WritePath("arr", [{ id: "b" }, { id: "a", inner: { n: 2 } }]);

      expect(tree.ReadPath("/a")).toEqual({ id: "a", inner: { n: 2 } });
      expect(tree.Snapshot("arr")).toEqual([{ id: "b" }, { id: "a", inner: { n: 2 } }]);
    });

    it("Changing the key of a stale embedded value missing a nested object writes it to the new key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("arr", [{ id: "a" }]);
      tree.WritePath("a", { id: "a", inner: { n: 1 } });
      tree.WritePath("arr", [{ id: "c", inner: { n: 2 } }]);

      expect(tree.ReadPath("/c")).toEqual({ id: "c", inner: { n: 2 } });
      expect(tree.ReadPath("/a")).toEqual({ id: "a", inner: { n: 1 } });
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

    it("Splice through an embedded array keeps the moved items' snapshots", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [{ val: 1 }, { val: 2 }, { val: 3 }] });
      const before = tree.Snapshot("/E.list");
      tree.SplicePath("value.list", 0, 1, []);
      const after = tree.Snapshot("/E.list");

      expect(after).toEqual([{ val: 2 }, { val: 3 }]);
      expect(after[0]).toBe(before[1]);
      expect(after[1]).toBe(before[2]);
      expect(tree.ReadPath("value.list")).toEqual([{ val: 2 }, { val: 3 }]);
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

      // The Store reads value.item through its root key E, so only E's own change is sent
      expect(tree.Commit()).toEqual([{ type: "write", path: ["E", "v"], value: 2 }]);
    });
  });

  // A key that's a prefix of the slot's path ("a" and "arr") isn't the slot's own home
  describe("keys that prefix a path", () => {
    it("Write through a slot whose path starts with the key updates the home value", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("arr", [{ id: "a", v: 1 }]);
      tree.WritePath("arr", [{ id: "a", v: 2 }]);

      expect(tree.ReadPath("/a")).toEqual({ id: "a", v: 2 });
    });

    it("A nested key that starts with its parent's key is stored at its own key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("a", { id: "a", child: { id: "ab" } });

      expect(tree.ReadPath("/ab")).toEqual({ id: "ab" });
    });
  });

  describe("slots hold their home", () => {
    it("A keyed array's slots are its entities' home objects", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 2 }]);

      expect(tree.rootState.items[0]).toBe(tree.rootState.A);
      expect(tree.rootState.items[1]).toBe(tree.rootState.B);
    });

    it("Rewriting the same entities leaves the array alone and diffs each home", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 2 }]);
      const array = tree.rootState.items;
      const a = tree.rootState.A;
      const before = tree.Snapshot("items");
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 3 }]);

      expect(tree.rootState.items).toBe(array);
      expect(tree.rootState.A).toBe(a);
      const after = tree.Snapshot("items");
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toEqual({ id: "B", v: 3 });
    });

    it("A keyed array nested in a value is replaced whole, as its homes' objects", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("value", { list: [{ id: "A" }, { id: "B" }] });
      tree.WritePath("value", { list: [{ id: "B" }, { id: "C" }] });

      expect(tree.rootState.value.list[0]).toBe(tree.rootState.B);
      expect(tree.rootState.value.list[1]).toBe(tree.rootState.C);
      expect(tree.ReadPath("/A")).toEqual({ id: "A" });
    });

    it("Rewriting an entity whose keyed children didn't change keeps its snapshot", () => {
      const key = (v: any) => typeof v?.key === "string" ? v.key : undefined;
      const types = () => [{ key: "t_1", name: "T", props: [{ key: "p_1", name: "a" }, { key: "p_2", name: "b" }] }];
      let runs = 0;
      const tree = new DiffTree(key, { "/": { projections: { count: { reads: ["types"], projection: (t: any[]) => (runs++, t.length) } } } });
      tree.WritePath("types", types());
      tree.RunProjections();
      tree.Commit();
      const before = tree.Snapshot("t_1");
      tree.WritePath("types", types());
      tree.RunProjections();

      expect(tree.Snapshot("t_1")).toBe(before);
      expect(runs).toBe(1);
      expect(tree.Commit()).toEqual([]);
    });

    it("A home keeps its identity when its entity is rewritten whole", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", a: 1 } });
      const home = tree.rootState.E;
      tree.WritePath("other", { id: "E", b: 2 });

      expect(tree.rootState.E).toBe(home);
      expect(home).toEqual({ id: "E", b: 2 });
      expect(tree.rootState.value.item).toBe(home);
    });

    it("Replacing a home with another type throws", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", a: 1 } });

      expect(() => tree.WritePath("E", [1])).toThrow();
      expect(() => tree.WritePath("E", 1)).toThrow();
      expect(tree.ReadPath("/E")).toEqual({ id: "E", a: 1 });
    });

    it("A slot written with a plain value is replaced, leaving the home alone", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E", a: 1 } });
      tree.WritePath("value.item", { a: 2 });

      expect(tree.ReadPath("/E")).toEqual({ id: "E", a: 1 });
      expect(tree.ReadPath("value.item")).toEqual({ a: 2 });
      expect(tree.rootState.value.item).not.toBe(tree.rootState.E);
    });

    it("A write through a slot invalidates the snapshots of the home and every slot", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("one", { item: { id: "E", v: 1 } });
      tree.WritePath("two", [{ id: "E", v: 1 }]);
      const home = tree.Snapshot("/E");
      const two = tree.Snapshot("two");
      tree.WritePath("one.item.v", 2);

      expect(tree.Snapshot("/E")).not.toBe(home);
      expect(tree.Snapshot("two")).not.toBe(two);
      expect(tree.Snapshot("two")).toEqual([{ id: "E", v: 2 }]);
    });

    it("Pushed and spliced keyed items are written to their homes and held as them", () => {
      const tree: any = new DiffTree(keyFunc);
      tree.WritePath("items", []);
      tree.PushPath("items", [{ id: "A", v: 1 }]);
      tree.SplicePath("items", 0, 0, [{ id: "B", v: 1 }, { id: "A", v: 2 }]);

      expect(tree.rootState.items).toEqual([{ id: "B", v: 1 }, { id: "A", v: 2 }, { id: "A", v: 2 }]);
      expect(tree.rootState.items[1]).toBe(tree.rootState.A);
      expect(tree.rootState.items[2]).toBe(tree.rootState.A);
    });
  });

  describe("Commit splices keyed arrays", () => {
    it("Reordering a keyed array commits a splice that moves the entity", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A" }, { id: "B" }, { id: "C" }]);
      tree.Commit();
      tree.WritePath("items", [{ id: "C" }, { id: "A" }, { id: "B" }]);

      expect(tree.Commit()).toEqual([{
        type: "splice",
        path: ["items"],
        splices: [
          { index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 2 }] },
          { index: 3, delete: 1, insert: [] },
        ]
      }]);
    });

    it("Reordering a keyed array keeps every entity's snapshot", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }]);
      const before = ["A", "B", "C", "D"].map(id => tree.Snapshot(id));
      tree.WritePath("items", [{ id: "A" }, { id: "C" }, { id: "B" }, { id: "D" }]);

      expect(["A", "B", "C", "D"].map(id => tree.Snapshot(id))).toEqual(before);
      ["A", "B", "C", "D"].forEach((id, x) => expect(tree.Snapshot(id)).toBe(before[x]));
    });

    it("An entity that changed is only diffed at its home, not spliced in its arrays", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 1 }]);
      tree.Commit();
      tree.WritePath("/B.v", 2);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["B", "v"], value: 2 }]);
    });

    it("An entity changed through its array is only diffed at its home", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 1 }, { id: "C", v: 1 }]);
      tree.Commit();
      tree.WritePath("items", [{ id: "A", v: 2 }, { id: "B", v: 1 }, { id: "C", v: 1 }]);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["A", "v"], value: 2 }]);
    });

    it("An entity that changed and moved is moved in its array and diffed at its home", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A", v: 1 }, { id: "B", v: 1 }, { id: "C", v: 1 }]);
      tree.Commit();
      tree.WritePath("items", [{ id: "C", v: 2 }, { id: "A", v: 1 }, { id: "B", v: 1 }]);

      const diff = tree.Commit();
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(expect.arrayContaining([
        { type: "write", path: ["C", "v"], value: 2 },
        {
          type: "splice", path: ["items"], splices: [
            { index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 2 }] },
            { index: 3, delete: 1, insert: [] },
          ]
        },
      ]));
    });

    it("An entity whose key changed is deleted and the new one inserted in its array", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [{ id: "A" }, { id: "B" }]);
      tree.Commit();
      tree.WritePath("items", [{ id: "A" }, { id: "X" }]);

      expect(tree.Commit()).toEqual(expect.arrayContaining([
        { type: "splice", path: ["items"], splices: [{ index: 1, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: { id: "X" } }] }] },
        { type: "write", path: ["X"], value: { id: "X" } },
      ]));
    });

    it("A route-key entity that changed is still deleted and inserted in its array", () => {
      const tree = new DiffTree((data: any) => data?.id ? `/sub/${data.id}` : undefined, { "/sub": { projections: {} } });
      tree.WritePath("value", { items: [{ id: "A", v: 1 }, { id: "B", v: 1 }] });
      tree.Commit();
      tree.WritePath("/sub/B.v", 2);

      expect(tree.Commit()).toEqual([{
        type: "splice", path: ["value", "items"],
        splices: [{ index: 1, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: { id: "B", v: 2 } }] }]
      }]);
    });

    it("A different entity in an object slot is written", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { item: { id: "E" } });
      tree.Commit();
      tree.WritePath("value.item", { id: "F" });

      expect(tree.Commit()).toEqual(expect.arrayContaining([
        { type: "write", path: ["value", "item"], value: { id: "F" } },
        { type: "write", path: ["F"], value: { id: "F" } },
      ]));
    });

    it("An entity the Store reads by its route key is diffed, not skipped", () => {
      const tree = new DiffTree((data: any) => data?.id ? `/sub/${data.id}` : undefined, { "/sub": { projections: {} } });
      tree.WritePath("value", { item: { id: "A", v: 1 } });
      tree.Commit();
      tree.WritePath("/sub/A.v", 2);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["value", "item", "v"], value: 2 }]);
    });

    it("An array of primitives or unkeyed objects is diffed by position", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { tags: ["a", "b"], points: [{ x: 1 }] });
      tree.Commit();
      tree.WritePath("value", { tags: ["a", "c"], points: [{ x: 2 }] });

      expect(tree.Commit()).toEqual([
        { type: "write", path: ["value", "points", 0, "x"], value: 2 },
        { type: "write", path: ["value", "tags", 1], value: "c" },
      ]);
    });
  });
});
