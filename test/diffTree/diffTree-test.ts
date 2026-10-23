import { describe, expect, it } from "vitest";
import { DiffTree } from '../../src/Store/Diff/diffTree';

// Route instances are private; tests inspect them through the root route
function RootRoute(tree: DiffTree) {
  return (tree as any).rootRoute;
}

describe("DiffTree", () => {
  const keyFunc = (data: any) => data?.id;

  describe("writes", () => {
    it("Write value to root path", () => {
      const tree = new DiffTree(undefined, undefined);
      tree.WritePath("value", { test: 1 });
      tree.WritePath("value.prop", 2);

      expect(tree.ReadPath("value")).toEqual({ test: 1, prop: 2 });
    });

    it("Write value to routed path", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/name", "test");

      expect(tree.ReadPath("/channel/1/name")).toEqual("test");
      expect(tree.ReadPath("name")).toBeUndefined();
    });

    it("Write value to route without a definition", () => {
      const tree = new DiffTree(undefined, undefined);
      tree.WritePath("/unknown/1/name", "test");

      expect(tree.ReadPath("/unknown/1/name")).toEqual("test");
      expect(RootRoute(tree).childRoutes.length).toEqual(0);
    });

    it("Written values are cloned", () => {
      const tree = new DiffTree();
      const value = { a: { b: 1 } };
      tree.WritePath("value", value);
      value.a.b = 2;

      expect(tree.ReadPath("value")).toEqual({ a: { b: 1 } });
    });

    it("Write to a projection output throws", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });

      expect(() => tree.WritePath("$projection_x", 1)).toThrow(/read-only/);
      expect(() => tree.WritePath("/channel/1/$projection_x", 1)).toThrow(/read-only/);
      expect(tree.ReadPath("$projection_x")).toBeUndefined();
    });

    it("Write to a route's root object throws", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });

      expect(() => tree.WritePath("/channel/1/", { a: 1 })).toThrow();
    });
  });

  describe("patch", () => {
    it("Patch merges into the value at a root path", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1, b: { c: 2 } });
      tree.PatchPath("value", { b: { d: 3 } });

      expect(tree.ReadPath("value")).toEqual({ a: 1, b: { c: 2, d: 3 } });
    });

    it("Patch merges into the value at a routed path", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/value", { a: 1, b: 1 });
      tree.PatchPath("/channel/1/value", { b: 2 });

      expect(tree.ReadPath("/channel/1/value")).toEqual({ a: 1, b: 2 });
    });

    it("Patch into a keyed value updates the keyed entity", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", v: 1 });
      tree.PatchPath("value", { v: 2 });

      expect(tree.ReadPath("/E")).toEqual({ id: "E", v: 2 });
    });

    it("Commit returns only the patched properties", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1, b: { c: 2 } });
      tree.Commit();
      tree.PatchPath("value", { b: { d: 3 } });

      expect(tree.Commit()).toEqual([{ type: "write", path: ["value", "b", "d"], value: 3 }]);
    });

    it("Patch to a projection output throws", () => {
      const tree = new DiffTree();

      expect(() => tree.PatchPath("$projection_x", { a: 1 })).toThrow(/read-only/);
    });
  });

  describe("snapshot", () => {
    it("Snapshot returns the value at a root path", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: { b: 1 } });

      expect(tree.Snapshot("value")).toEqual({ a: { b: 1 } });
      expect(tree.Snapshot("value.a.b")).toEqual(1);
    });

    it("Snapshot returns the value at a routed path", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/value", { a: 1 });

      expect(tree.Snapshot("/channel/1/value")).toEqual({ a: 1 });
      expect(tree.Snapshot("/channel/1/value.a")).toEqual(1);
    });

    it("Snapshot is a copy of the raw value", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1 });

      expect(tree.Snapshot("value")).not.toBe(tree.ReadPath("value"));
    });

    it("Snapshot is cached until the value changes", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: { b: 1 }, c: { d: 1 } });
      const before = tree.Snapshot("value");

      expect(tree.Snapshot("value")).toBe(before);

      tree.WritePath("value.a.b", 2);
      const after = tree.Snapshot("value");

      expect(after).not.toBe(before);
      expect(after).toEqual({ a: { b: 2 }, c: { d: 1 } });
      // Unchanged branches keep their snapshot
      expect(after.c).toBe(before.c);
    });

    it("Projection output is its own snapshot", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { wrap: { reads: ["a"], projection: (a: number) => ({ a }) } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(tree.Snapshot("$projection_wrap")).toBe(tree.ReadPath("$projection_wrap"));
    });
  });

  describe("splice", () => {
    it("Splice removes items", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3, 4]);
      tree.SplicePath("items", 1, 2, []);

      expect(tree.ReadPath("items")).toEqual([1, 4]);
    });

    it("Splice inserts items", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3]);
      tree.SplicePath("items", 1, 0, [8, 9]);

      expect(tree.ReadPath("items")).toEqual([1, 8, 9, 2, 3]);
    });

    it("Splice replaces items", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3, 4]);
      tree.SplicePath("items", 1, 1, [9]);

      expect(tree.ReadPath("items")).toEqual([1, 9, 3, 4]);
    });

    it("Splice inserts more items than it removes", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3, 4]);
      tree.SplicePath("items", 1, 1, [7, 8, 9]);

      expect(tree.ReadPath("items")).toEqual([1, 7, 8, 9, 3, 4]);
    });

    it("Splice removes more items than it inserts", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3, 4, 5]);
      tree.SplicePath("items", 1, 3, [9]);

      expect(tree.ReadPath("items")).toEqual([1, 9, 5]);
    });

    it("Splice at the end of the array appends", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2]);
      tree.SplicePath("items", 2, 0, [3]);

      expect(tree.ReadPath("items")).toEqual([1, 2, 3]);
    });

    it("Splice past the end of the array removes only the remaining items", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3]);
      tree.SplicePath("items", 1, 10, []);

      expect(tree.ReadPath("items")).toEqual([1]);
    });

    it("Splice a routed array", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/items", [1, 2, 3]);
      tree.SplicePath("/channel/1/items", 0, 1, [9]);

      expect(tree.ReadPath("/channel/1/items")).toEqual([9, 2, 3]);
    });

    it("Splice a nested array", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { list: [1, 2, 3] });
      tree.SplicePath("value.list", 1, 1, []);

      expect(tree.ReadPath("value")).toEqual({ list: [1, 3] });
    });

    it("Spliced items are cloned", () => {
      const tree = new DiffTree();
      const item = { a: 1 };
      tree.WritePath("items", []);
      tree.SplicePath("items", 0, 0, [item]);
      item.a = 2;

      expect(tree.ReadPath("items")).toEqual([{ a: 1 }]);
    });

    it("Spliced keyed items are written to their key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", [1]);
      tree.SplicePath("items", 0, 0, [{ id: "A", v: 1 }]);

      expect(tree.ReadPath("/A")).toEqual({ id: "A", v: 1 });
    });

    it("Splice into a keyed entity's array updates the entity", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1, 2, 3] });
      tree.SplicePath("value.list", 0, 1, []);

      expect(tree.ReadPath("/E.list")).toEqual([2, 3]);
    });

    it("Splice invalidates the array's snapshot", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3]);
      tree.Snapshot("items");
      tree.SplicePath("items", 0, 1, []);

      expect(tree.Snapshot("items")).toEqual([2, 3]);
    });

    it("Splice that keeps the array's length invalidates its snapshot", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3]);
      tree.Snapshot("items");
      tree.SplicePath("items", 0, 1, [9]);

      expect(tree.Snapshot("items")).toEqual([9, 2, 3]);
    });

    it("Commit returns the spliced array's changes", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3, 4]);
      tree.Commit();
      tree.SplicePath("items", 1, 1, []);

      expect(tree.Commit()).toEqual([
        { type: "move", path: ["items"], sourceProp: 2, targetProp: 1 },
        { type: "move", path: ["items"], sourceProp: 3, targetProp: 2 },
        { type: "write", path: ["items", "length"], value: 3 }
      ]);
    });

    it("Splice reruns a projection reading the array", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { count: { reads: ["items"], projection: (items: any[]) => items.length } } }
      });
      tree.WritePath("items", [1, 2]);
      tree.RunProjections();
      tree.SplicePath("items", 0, 1, []);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_count")).toEqual(1);
    });

    it("Splice to a missing path throws", () => {
      const tree = new DiffTree();

      expect(() => tree.SplicePath("items", 0, 0, [1])).toThrow();
    });

    it("Splice to a value that isn't an array throws", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1 });

      expect(() => tree.SplicePath("value", 0, 0, [1])).toThrow();
    });

    it("Splice to a projection output throws", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { list: { reads: ["a"], projection: (a: number) => [a] } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(() => tree.SplicePath("$projection_list", 0, 0, [2])).toThrow(/read-only/);
      expect(tree.ReadPath("$projection_list")).toEqual([1]);
    });
  });

  describe("keyed entities", () => {
    it("Keyed entity from a root write is written to the root", () => {
      const tree = new DiffTree(keyFunc, undefined);
      tree.WritePath("value", { item: { id: "MY_ID", value: "test" } });

      expect(tree.ReadPath("/MY_ID")).toEqual({ id: "MY_ID", value: "test" });
    });

    it("Keyed entity is local to the route written to", () => {
      const tree = new DiffTree(keyFunc, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/value", { id: "MY_ID", value: "test" });

      expect(tree.ReadPath("/channel/1/MY_ID")).toEqual({ id: "MY_ID", value: "test" });
      expect(tree.ReadPath("/MY_ID")).toBeUndefined();
    });

    it("Keyed entity with a key starting with / is written to the root", () => {
      const tree = new DiffTree((data: any) => data?.id ? `/${data.id}` : undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/value", { id: "MY_ID", value: "test" });

      expect(tree.ReadPath("/MY_ID")).toEqual({ id: "MY_ID", value: "test" });
      expect(tree.ReadPath("/channel/1/MY_ID")).toBeUndefined();
    });

    it("Keyed children of a keyed value are expanded", () => {
      const tree = new DiffTree(keyFunc, undefined);
      tree.WritePath("value", { id: "PARENT", child: { id: "CHILD" } });

      expect(tree.ReadPath("/PARENT")).toBeDefined();
      expect(tree.ReadPath("/CHILD")).toEqual({ id: "CHILD" });
    });

    it("Write into a keyed value updates the keyed entity", () => {
      const tree = new DiffTree(keyFunc, undefined);
      tree.WritePath("value", { id: "MY_ID", value: "test" });
      tree.WritePath("value.value", "CHANGED");

      expect(tree.ReadPath("/MY_ID.value")).toEqual("CHANGED");
    });

    it("Keyed entity with a sub route key creates the child route instance", () => {
      const tree = new DiffTree((data: any) => data?.id ? `sub/${data.id}` : undefined, {
        "/channel/{id}": { projections: {}, routes: { "/sub": { projections: {} } } }
      });
      tree.WritePath("/channel/1/value", { id: "MY_ID" });

      expect(tree.ReadPath("/channel/1/sub/MY_ID")).toEqual({ id: "MY_ID" });
      const channel = RootRoute(tree).childRoutes[0];
      expect(channel.childRoutes.map((r: any) => r.parts)).toEqual([["sub"]]);
    });
  });

  describe("home route keying", () => {
    // Keyed into /channel/{id}/sub, where the sub route's own keyFunc applies
    const definitions = () => ({
      "/channel/{id}": {
        projections: {},
        keyFunc: (data: any) => data?.id ? `sub/${data.id}` : undefined,
        routes: { "/sub": { projections: {}, keyFunc: (data: any) => data?.id ? `k_${data.id}` : undefined } }
      }
    });

    it("Keyed entity's children are keyed in the route the entity lives in", () => {
      const tree = new DiffTree(undefined, definitions());
      tree.WritePath("/channel/1/item", { id: "A", child: { id: "B" } });

      expect(tree.ReadPath("/channel/1/sub/A")).toEqual({ id: "A", child: { id: "B" } });
      expect(tree.ReadPath("/channel/1/sub/k_B")).toEqual({ id: "B" });
      expect(tree.ReadPath("/channel/1/sub/B")).toEqual({ id: "B" });
    });

    it("Write into a keyed entity's child updates the child in its home route", () => {
      const tree = new DiffTree(undefined, definitions());
      tree.WritePath("/channel/1/item", { id: "A", child: { id: "B", v: 1 } });
      tree.WritePath("/channel/1/item.child.v", 2);

      expect(tree.ReadPath("/channel/1/sub/k_B.v")).toEqual(2);
    });

    it("Write into a keyed ancestor uses the path below the ancestor", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "V", item: { a: 1 } });
      tree.WritePath("value.item.a", 2);

      expect(tree.ReadPath("/V.item.a")).toEqual(2);
    });
  });

  describe("route keyFunc", () => {
    it("Route keyFunc is used for writes to the route", () => {
      const tree = new DiffTree(keyFunc, {
        "/channel/{id}": { projections: {}, keyFunc: (data: any) => data?.cid }
      });
      tree.WritePath("/channel/1/value", { id: "ID", cid: "CID" });

      expect(tree.ReadPath("/channel/1/CID")).toEqual({ id: "ID", cid: "CID" });
      expect(tree.ReadPath("/channel/1/ID")).toBeUndefined();
    });

    it("Tree keyFunc is the default for routes without one", () => {
      const tree = new DiffTree(keyFunc, {
        "/channel/{id}": { projections: {}, keyFunc: (data: any) => data?.cid, routes: { "/sub": { projections: {} } } }
      });
      tree.WritePath("/channel/1/sub/value", { id: "ID", cid: "CID" });

      expect(tree.ReadPath("/channel/1/sub/ID")).toEqual({ id: "ID", cid: "CID" });
    });

    it("Root route definition keyFunc is used for root writes", () => {
      const tree = new DiffTree(keyFunc, {
        "/": { projections: {}, keyFunc: (data: any) => data?.cid }
      });
      tree.WritePath("value", { id: "ID", cid: "CID" });

      expect(tree.ReadPath("/CID")).toBeDefined();
      expect(tree.ReadPath("/ID")).toBeUndefined();
    });
  });

  describe("route instances", () => {
    const projection = () => undefined;

    it("Default root route is created when none is defined", () => {
      const definitions = { "/channel/{id}": { projections: {} } };
      const tree = new DiffTree(undefined, definitions);

      expect(RootRoute(tree).parts).toEqual([]);
      expect(Object.keys(definitions)).toEqual(["/channel/{id}"]);
    });

    it("Route instance is created on first write and reused", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/name", "a");
      tree.WritePath("/channel/1/other", "b");
      tree.WritePath("/channel/2/name", "c");

      expect(RootRoute(tree).childRoutes.map((r: any) => r.parts)).toEqual([["channel", "1"], ["channel", "2"]]);
    });

    it("Nested route instance is created under its parent", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: {}, routes: { "/user/{userId}": { projections: {} } } }
      });
      tree.WritePath("/channel/1/user/u1/name", "test");

      const channel = RootRoute(tree).childRoutes[0];
      expect(channel.parts).toEqual(["channel", "1"]);
      expect(channel.childRoutes[0].parts).toEqual(["user", "u1"]);
    });

    it("Unmatched child route creates no instances", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: {}, routes: { "/user/{userId}": { projections: {} } } }
      });
      tree.WritePath("/channel/1/bogus/x/name", "test");

      expect(RootRoute(tree).childRoutes.length).toEqual(0);
    });

    it("Projection reads are pathed to the route instance", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": {
          projections: { count: { reads: ["name", "meta.value", "/other/value"], projection } },
          routes: { "/user/{userId}": { projections: { label: { reads: ["name"], projection } } } }
        }
      });
      tree.WritePath("/channel/1234/user/u1/name", "test");

      const channel = RootRoute(tree).childRoutes[0];
      expect(channel.projections[0].key).toEqual("count");
      expect(channel.projections[0].reads).toEqual(["/channel/1234/name", "/channel/1234/meta.value", "/other/value"]);
      expect(channel.childRoutes[0].projections[0].reads).toEqual(["/channel/1234/user/u1/name"]);
    });

    it("Root route projection reads are pathed to the root", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { count: { reads: ["name"], projection } } }
      });

      expect(RootRoute(tree).projections[0].reads).toEqual(["/name"]);
    });
  });

  describe("commit", () => {
    it("First commit of an empty tree returns an empty diff", () => {
      const tree = new DiffTree();

      expect(tree.Commit()).toEqual([]);
    });

    it("First commit returns a write for each root value", () => {
      const tree = new DiffTree();
      tree.WritePath("a", 1);
      tree.WritePath("b", { c: 2 });

      expect(tree.Commit()).toEqual([
        { type: "write", path: ["a"], value: 1 },
        { type: "write", path: ["b"], value: { c: 2 } }
      ]);
    });

    it("Commit returns the writes since the last commit", () => {
      const tree = new DiffTree();
      tree.Commit();
      tree.WritePath("value", { a: 1, b: 2 });

      expect(tree.Commit()).toEqual([{ type: "write", path: ["value"], value: { a: 1, b: 2 } }]);
    });

    it("Commit returns only the changed part of a value", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1, b: 2 });
      tree.Commit();
      tree.WritePath("value.a", 5);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["value", "a"], value: 5 }]);
    });

    it("Commit returns every write in the batch", () => {
      const tree = new DiffTree();
      tree.Commit();
      tree.WritePath("x", 1);
      tree.WritePath("y", 2);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["x"], value: 1 }, { type: "write", path: ["y"], value: 2 }]);
    });

    it("Commit returns an empty diff when nothing changed", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1 });
      tree.Commit();

      expect(tree.Commit()).toEqual([]);

      tree.WritePath("value.a", 1);
      expect(tree.Commit()).toEqual([]);
    });

    it("Commit returns a write of undefined", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1 });
      tree.Commit();
      tree.WritePath("value", undefined);

      expect(tree.Commit()).toEqual([{ type: "write", path: ["value"], value: undefined }]);
    });

    it("Commit excludes route state", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.Commit();
      tree.WritePath("/channel/1/name", "test");

      expect(tree.Commit()).toEqual([]);
    });

    it("Commit reads keyed children through the route they live in", () => {
      const tree = new DiffTree((data: any) => data?.id ? `/sub/${data.id}` : undefined, {
        "/sub": { projections: {}, keyFunc: (data: any) => data?.id ? `k_${data.id}` : undefined }
      });
      tree.WritePath("value", { item: { id: "A", child: { id: "B", v: 1 } } });
      tree.Commit();

      // Only the entity's home copy changes; the root's embedded copy is read through it
      tree.WritePath("/sub/k_B.v", 2);
      expect(tree.ReadPath("value.item.child.v")).toEqual(1);
      expect(tree.Commit()).toEqual([{ type: "write", path: ["value", "item", "child", "v"], value: 2 }]);
    });

    it("Commit includes a keyed entity written to the root", () => {
      const tree = new DiffTree(keyFunc);
      tree.Commit();
      tree.WritePath("value", { item: { id: "MY_ID", v: 1 } });

      expect(tree.Commit()).toEqual(expect.arrayContaining([
        { type: "write", path: ["MY_ID"], value: { id: "MY_ID", v: 1 } },
        { type: "write", path: ["value"], value: { item: { id: "MY_ID", v: 1 } } }
      ]));
    });
  });

  describe("projections", () => {
    it("Projection output is written to $projection_<key> in its route", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: { upper: { reads: ["name"], projection: (name: string) => name.toUpperCase() } } }
      });
      tree.WritePath("/channel/1/name", "test");
      tree.RunProjections();

      expect(tree.ReadPath("/channel/1/$projection_upper")).toEqual("TEST");
    });

    it("Projection receives read values positionally", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { sum: { reads: ["a", "b.c"], projection: (a: number, c: number) => a + c } } }
      });
      tree.WritePath("a", 1);
      tree.WritePath("b", { c: 2 });
      tree.RunProjections();

      expect(tree.ReadPath("$projection_sum")).toEqual(3);
    });

    it("Projection runs with undefined for a missing read value", () => {
      let read: any[] | undefined;
      const tree = new DiffTree(undefined, {
        "/": { projections: { sum: { reads: ["a", "b"], projection: (a: number, b: number) => (read = [a, b], a + (b ?? 0)) } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(read).toEqual([1, undefined]);
      expect(tree.ReadPath("$projection_sum")).toEqual(1);
    });

    it("Projection is skipped when a read's parent is missing", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["a", "x.b"], projection: (a: number) => (runs++, a) } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(runs).toEqual(0);
      expect(tree.ReadPath("$projection_copy")).toBeUndefined();
    });

    it("Projection is skipped when a read's route instance is missing", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["/other/1/x"], projection: (x: any) => (runs++, x) } } },
        "/other/{id}": { projections: {} }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(runs).toEqual(0);
    });

    it("Projection outputs undefined when a read value goes missing", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["a"], projection: (a: number) => a } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();
      tree.WritePath("a", undefined);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_copy")).toBeUndefined();
    });

    it("Projection keeps its last output when a read's parent goes missing", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["x.b"], projection: (b: number) => b } } }
      });
      tree.WritePath("x", { b: 1 });
      tree.RunProjections();
      tree.WritePath("x", undefined);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_copy")).toEqual(1);
    });

    it("Projection is memoized on its read values", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { count: { reads: ["items"], projection: (items: any[]) => (runs++, items.length) } } }
      });
      tree.WritePath("items", [1, 2]);
      tree.WritePath("other", 1);
      tree.RunProjections();
      tree.RunProjections();
      tree.WritePath("other", 2);
      tree.RunProjections();

      expect(runs).toEqual(1);

      tree.WritePath("items", [1, 2, 3]);
      tree.RunProjections();

      expect(runs).toEqual(2);
      expect(tree.ReadPath("$projection_count")).toEqual(3);
    });

    it("Projection reading the route's root object sees every value in the route", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: { keys: { reads: [""], projection: (state: any) => (runs++, Object.keys(state).sort()) } } }
      });
      tree.WritePath("/channel/1/a", 1);
      tree.WritePath("/channel/1/b", 2);
      tree.RunProjections();

      expect(tree.ReadPath("/channel/1/$projection_keys")).toEqual(["a", "b"]);

      // Its own output is in the root object, but writing it doesn't count as a change
      tree.RunProjections();
      expect(runs).toEqual(1);
    });

    it("Projections run after the projections they read", () => {
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            // Declared before the projection it reads
            doubled: { reads: ["$projection_sum"], projection: (sum: number) => sum * 2 },
            sum: { reads: ["a", "b"], projection: (a: number, b: number) => a + b }
          }
        }
      });
      tree.WritePath("a", 1);
      tree.WritePath("b", 2);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_doubled")).toEqual(6);
    });

    it("Root projection reads a route projection's output", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { summary: { reads: ["/channel/1/$projection_upper"], projection: (upper: string) => ({ upper }) } } },
        "/channel/{id}": { projections: { upper: { reads: ["name"], projection: (name: string) => name.toUpperCase() } } }
      });
      tree.WritePath("/channel/1/name", "test");
      tree.RunProjections();

      expect(tree.ReadPath("$projection_summary")).toEqual({ upper: "TEST" });
    });

    it("Route projection output reaches the commit only through a root projection", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { summary: { reads: ["/channel/1/$projection_upper"], projection: (upper: string) => upper } } },
        "/channel/{id}": { projections: { upper: { reads: ["name"], projection: (name: string) => name.toUpperCase() } } }
      });
      tree.Commit();
      tree.WritePath("/channel/1/name", "test");
      tree.RunProjections();

      expect(tree.Commit()).toEqual([{ type: "write", path: ["$projection_summary"], value: "TEST" }]);
    });

    it("Projection cycle throws", () => {
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            a: { reads: ["$projection_b"], projection: (b: any) => b },
            b: { reads: ["$projection_a"], projection: (a: any) => a }
          }
        }
      });

      expect(() => tree.RunProjections()).toThrow(/cycle/);
    });

    it("Projection cycle across routes throws once the route instance exists", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { summary: { reads: ["/channel/1/$projection_back"], projection: (back: any) => back } } },
        "/channel/{id}": { projections: { back: { reads: ["/$projection_summary"], projection: (summary: any) => summary } } }
      });
      tree.RunProjections();

      tree.WritePath("/channel/1/name", "test");
      expect(() => tree.RunProjections()).toThrow(/cycle/);
    });

    it("Two projections reading the route's root object are a cycle", () => {
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            a: { reads: [""], projection: () => 1 },
            b: { reads: [""], projection: () => 2 }
          }
        }
      });

      expect(() => tree.RunProjections()).toThrow(/cycle/);
    });
  });

  describe("push", () => {
    it("Push appends items to a root array", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1]);
      tree.PushPath("items", [2, 3]);

      expect(tree.ReadPath("items")).toEqual([1, 2, 3]);
    });

    it("Push appends items to a routed array", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/items", [1]);
      tree.PushPath("/channel/1/items", [2]);

      expect(tree.ReadPath("/channel/1/items")).toEqual([1, 2]);
    });

    it("Push appends items to a nested array", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { list: [1] });
      tree.PushPath("value.list", [2]);

      expect(tree.ReadPath("value")).toEqual({ list: [1, 2] });
    });

    it("Push of no items changes nothing", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1]);
      tree.Commit();
      tree.PushPath("items", []);

      expect(tree.ReadPath("items")).toEqual([1]);
      expect(tree.Commit()).toEqual([]);
    });

    it("Push to a missing path throws", () => {
      const tree = new DiffTree();

      expect(() => tree.PushPath("items", [1])).toThrow();
    });

    it("Push to a value that isn't an array throws", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1 });

      expect(() => tree.PushPath("value", [1])).toThrow();
    });

    it("Push to a projection output throws", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { list: { reads: ["a"], projection: (a: number) => [a] } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(() => tree.PushPath("$projection_list", [2])).toThrow();
      expect(tree.ReadPath("$projection_list")).toEqual([1]);
    });

    it("Pushed items are cloned", () => {
      const tree = new DiffTree();
      const item = { a: 1 };
      tree.WritePath("items", []);
      tree.PushPath("items", [item]);
      item.a = 2;

      expect(tree.ReadPath("items")).toEqual([{ a: 1 }]);
    });

    it("Pushed keyed items are written to their key", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("items", []);
      tree.PushPath("items", [{ id: "A", v: 1 }]);

      expect(tree.ReadPath("/A")).toEqual({ id: "A", v: 1 });
    });

    it("Push into a keyed entity's array updates the entity", () => {
      const tree = new DiffTree(keyFunc);
      tree.WritePath("value", { id: "E", list: [1] });
      tree.PushPath("value.list", [2]);

      expect(tree.ReadPath("/E.list")).toEqual([1, 2]);
    });

    it("Commit returns the pushed items", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1]);
      tree.Commit();
      tree.PushPath("items", [2, 3]);

      expect(tree.Commit()).toEqual([
        { type: "write", path: ["items", 1], value: 2 },
        { type: "write", path: ["items", 2], value: 3 },
        { type: "write", path: ["items", "length"], value: 3 }
      ]);
    });

    it("Push reruns a projection reading the array", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { count: { reads: ["items"], projection: (items: any[]) => items.length } } }
      });
      tree.WritePath("items", [1]);
      tree.RunProjections();
      tree.PushPath("items", [2]);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_count")).toEqual(2);
    });
  });
});
