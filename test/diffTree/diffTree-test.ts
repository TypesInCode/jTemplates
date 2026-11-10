import { describe, expect, it, vi } from "vitest";
import { DiffTree } from '../../src/Store/Diff/diffTree';
import { Snapshot } from '../../src/Store/Tree/snapshot';

// Route instances are private; tests inspect them through the root route
function RootRoute(tree: DiffTree) {
  return (tree as any).rootRoute;
}

// A route's child instances, in creation order
function Children(route: any): any[] {
  return [...route.childRoutes.values()];
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
      expect(Children(RootRoute(tree)).length).toEqual(0);
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

    it("Splice past the end of the array appends", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2]);
      tree.SplicePath("items", 5, 0, [3]);

      expect(tree.ReadPath("items")).toEqual([1, 2, 3]);
    });

    it("Splice with an Infinity delete count removes the rest of the array", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2, 3]);
      tree.SplicePath("items", 1, Infinity, [9]);

      expect(tree.ReadPath("items")).toEqual([1, 9]);
    });

    it("Splice that changes nothing commits nothing", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [1, 2]);
      tree.Commit();
      tree.SplicePath("items", 1, 0, []);

      expect(tree.Commit()).toEqual([]);
    });

    it("Splice keeps moved items' objects", () => {
      const tree = new DiffTree();
      tree.WritePath("items", [{ a: 1 }, { a: 2 }]);
      const second = (tree.ReadPath("items") as any[])[1];
      tree.SplicePath("items", 0, 1, []);

      expect((tree.ReadPath("items") as any[])[0]).toBe(second);
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
        { type: "write", path: ["items", 1], value: 3 },
        { type: "write", path: ["items", 2], value: 4 },
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
      const channel = Children(RootRoute(tree))[0];
      expect(Children(channel).map((r: any) => r.parts)).toEqual([["sub"]]);
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
      // B has one home: the one its parent's route keys it to
      expect(tree.ReadPath("/channel/1/sub/B")).toBeUndefined();
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

    it("Undefined child route uses its nearest defined route's keyFunc", () => {
      const tree = new DiffTree(keyFunc, {
        "/channel/{id}": { projections: {}, keyFunc: (data: any) => data?.cid }
      });
      tree.WritePath("/channel/1/bogus/x/value", { id: "ID", cid: "CID" });

      expect(tree.ReadPath("/channel/1/bogus/x/CID")).toEqual({ id: "ID", cid: "CID" });
      expect(tree.ReadPath("/channel/1/bogus/x/ID")).toBeUndefined();
    });

    it("Path matching no route definition uses the root route's keyFunc", () => {
      const tree = new DiffTree(keyFunc, {
        "/": { projections: {}, keyFunc: (data: any) => data?.cid },
        "/channel/{id}": { projections: {} }
      });
      tree.WritePath("/bogus/x/value", { id: "ID", cid: "CID" });

      expect(tree.ReadPath("/bogus/x/CID")).toEqual({ id: "ID", cid: "CID" });
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

      expect(Children(RootRoute(tree)).map((r: any) => r.parts)).toEqual([["channel", "1"], ["channel", "2"]]);
    });

    it("Route instances of patterns with different segment counts are each found again", () => {
      const tree = new DiffTree(undefined, {
        "/flag/{id}": { projections: {}, routes: { "/note/{noteId}": { projections: {} } } },
        "/item/{id}/{rev}": { projections: {}, routes: { "/note/{noteId}": { projections: {} } } }
      });
      tree.WritePath("/flag/1/name", "a");
      tree.WritePath("/item/1/2/name", "b");
      // A deeper path is a new route path, so it's resolved through the instances already made
      tree.WritePath("/flag/1/note/n1/text", "c");
      tree.WritePath("/item/1/2/note/n1/text", "d");

      expect(Children(RootRoute(tree)).map((r: any) => r.parts)).toEqual([["flag", "1"], ["item", "1", "2"]]);
      expect(Children(RootRoute(tree)).map((r: any) => Children(r).map((c: any) => c.path))).toEqual([
        ["/flag/1/note/n1/"],
        ["/item/1/2/note/n1/"]
      ]);
      expect(tree.ReadPath("/item/1/2/note/n1/text")).toEqual("d");
    });

    it("Nested route instance is created under its parent", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: {}, routes: { "/user/{userId}": { projections: {} } } }
      });
      tree.WritePath("/channel/1/user/u1/name", "test");

      const channel = Children(RootRoute(tree))[0];
      expect(channel.parts).toEqual(["channel", "1"]);
      expect(Children(channel)[0].parts).toEqual(["user", "u1"]);
    });

    it("Unmatched child route still creates its matched parent instances", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: {}, routes: { "/user/{userId}": { projections: {} } } }
      });
      tree.WritePath("/channel/1/bogus/x/name", "test");

      const channel = Children(RootRoute(tree))[0];
      expect(channel.parts).toEqual(["channel", "1"]);
      expect(Children(channel).length).toEqual(0);
      expect(tree.ReadPath("/channel/1/bogus/x/name")).toEqual("test");
    });

    it("Parent projection reads a child path with no route definition", () => {
      const tree = new DiffTree(undefined, {
        "/parent/{id}": { projections: { names: { reads: ["child/row_*/name"], projection: (names: any) => names } } }
      });
      tree.WritePath("/parent/1/child/row_1/name", "a");
      tree.RunProjections();

      expect(tree.ReadPath("/parent/1/$projection_names")).toEqual({ row_1: "a" });
    });

    it("Projection reads are pathed to the route instance", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": {
          projections: { count: { reads: ["name", "meta.value", "/other/value"], projection } },
          routes: { "/user/{userId}": { projections: { label: { reads: ["name"], projection } } } }
        }
      });
      tree.WritePath("/channel/1234/user/u1/name", "test");

      const channel = Children(RootRoute(tree))[0];
      expect(channel.projections[0].key).toEqual("count");
      expect(channel.projections[0].reads).toEqual(["/channel/1234/name", "/channel/1234/meta.value", "/other/value"]);
      expect(Children(channel)[0].projections[0].reads).toEqual(["/channel/1234/user/u1/name"]);
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

      // The root's slot holds the entity's home object, so it reads the change
      tree.WritePath("/sub/k_B.v", 2);
      expect(tree.ReadPath("value.item.child.v")).toEqual(2);
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

    it("Wildcard read passes every matching route root keyed by segment", () => {
      const tree = new DiffTree(undefined, {
        "/parent/{id}": { projections: { rows: { reads: ["child/row_*/"], projection: (rows: any) => rows } } }
      });
      tree.WritePath("/parent/1/child/row_1/name", "a");
      tree.WritePath("/parent/1/child/row_2/name", "b");
      tree.WritePath("/parent/1/child/other_1/name", "c");
      tree.RunProjections();

      expect(tree.ReadPath("/parent/1/$projection_rows")).toEqual({ row_1: { name: "a" }, row_2: { name: "b" } });
    });

    it("Wildcard read selects a property and leaves out routes missing it", () => {
      const tree = new DiffTree(undefined, {
        "/parent/{id}": { projections: { names: { reads: ["child/row_*/name"], projection: (names: any) => names } } }
      });
      tree.WritePath("/parent/1/child/row_1/name", "a");
      tree.WritePath("/parent/1/child/row_2/other", "b");
      tree.RunProjections();

      expect(tree.ReadPath("/parent/1/$projection_names")).toEqual({ row_1: "a" });
    });

    it("Wildcard read with no matches passes an empty object", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { rows: { reads: ["/rows/*/"], projection: (rows: any) => Object.keys(rows).length } } }
      });
      tree.WritePath("a", 1);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_rows")).toEqual(0);
    });

    it("Wildcard read reruns only when a match changes, is added or is removed", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { names: { reads: ["/rows/row_*/name"], projection: (names: any) => (runs++, Object.values(names)) } } }
      });
      tree.WritePath("/rows/row_1/name", "a");
      tree.RunProjections();
      tree.RunProjections();
      expect(runs).toEqual(1);

      tree.WritePath("/rows/row_2/name", "b");
      tree.RunProjections();
      expect(tree.ReadPath("$projection_names")).toEqual(["a", "b"]);

      tree.WritePath("/rows/row_1/name", "c");
      tree.RunProjections();
      expect(tree.ReadPath("$projection_names")).toEqual(["c", "b"]);

      tree.WritePath("/rows/row_2/other", 1);
      tree.RunProjections();
      expect(runs).toEqual(3);
    });

    it("Wildcard read runs after the projections it matches", () => {
      const tree = new DiffTree(undefined, {
        "/parent/{id}": {
          projections: { uppers: { reads: ["child/row_*/$projection_upper"], projection: (uppers: any) => uppers } },
          routes: {
            "/child/{row}": { projections: { upper: { reads: ["name"], projection: (name: string) => name.toUpperCase() } } }
          }
        }
      });
      tree.WritePath("/parent/1/child/row_1/name", "a");
      tree.WritePath("/parent/1/child/row_2/name", "b");
      tree.RunProjections();

      expect(tree.ReadPath("/parent/1/$projection_uppers")).toEqual({ row_1: "A", row_2: "B" });
    });

    it("Invalid wildcard reads throw", () => {
      for (const read of ["child/row_*_x/", "a*/b*/", "child/row/na*me"])
        expect(() => new DiffTree(undefined, { "/": { projections: { bad: { reads: [read], projection: () => 0 } } } })).toThrow(/wildcard/);
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

  describe("keyed projections", () => {
    it("Projects each entry with its key", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { labels: { read: "rows", projection: (row: any, key: string) => `${key}:${row.name}` } } }
      });
      tree.WritePath("rows", { a: { name: "x" }, b: { name: "y" } });
      tree.RunProjections();

      expect(tree.ReadPath("$projection_labels")).toEqual({ a: "a:x", b: "b:y" });
    });

    it("Keeps an unchanged entry's output without calling the projection", () => {
      const calls: string[] = [];
      const tree = new DiffTree(undefined, {
        "/": { projections: { upper: { read: "rows", projection: (row: any, key: string) => (calls.push(key), { name: row.name.toUpperCase() }) } } }
      });
      tree.WritePath("rows", { a: { name: "x" }, b: { name: "y" } });
      tree.RunProjections();
      const before = tree.ReadPath("$projection_upper") as any;
      tree.WritePath("rows.b.name", "z");
      tree.RunProjections();
      const after = tree.ReadPath("$projection_upper") as any;

      expect(calls).toEqual(["a", "b", "b"]);
      expect(after).not.toBe(before);
      expect(after.a).toBe(before.a);
      expect(after.b).toEqual({ name: "Z" });
    });

    it("Leaves out an entry the projection returns undefined for, without calling it again while it's unchanged", () => {
      const calls: string[] = [];
      const tree = new DiffTree(undefined, {
        "/": { projections: { even: { read: "values", projection: (value: number, key: string) => (calls.push(key), value % 2 === 0 ? value : undefined) } } }
      });
      tree.WritePath("values", { a: 1, b: 2 });
      tree.RunProjections();
      expect(tree.ReadPath("$projection_even")).toEqual({ b: 2 });
      expect(Object.keys(tree.ReadPath("$projection_even") as object)).toEqual(["b"]);

      tree.WritePath("values.c", 4);
      tree.RunProjections();
      expect(tree.ReadPath("$projection_even")).toEqual({ b: 2, c: 4 });
      expect(calls).toEqual(["a", "b", "c"]);
    });

    it("Keeps its output when only left-out entries change", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { even: { read: "values", projection: (value: number) => value % 2 === 0 ? value : undefined } } }
      });
      tree.WritePath("values", { a: 1, b: 2 });
      tree.RunProjections();
      const before = tree.ReadPath("$projection_even");
      tree.WritePath("values.a", 3);
      tree.WritePath("values.c", 5);
      tree.RunProjections();

      expect(tree.ReadPath("$projection_even")).toBe(before);
    });

    it("Drops a removed key", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { read: "values", projection: (value: number) => value } } }
      });
      tree.WritePath("values", { a: 1, b: 2 });
      tree.RunProjections();
      tree.WritePath("values", { a: 1 });
      tree.RunProjections();

      expect(tree.ReadPath("$projection_copy")).toEqual({ a: 1 });
    });

    it("Reads a missing record as an empty one, and skips while the record's parent is missing", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { read: "group.values", projection: (value: number) => (runs++, value) } } }
      });
      tree.WritePath("other", 1);
      tree.RunProjections();
      expect(tree.ReadPath("$projection_copy")).toBeUndefined();

      tree.WritePath("group", {});
      tree.RunProjections();
      expect(tree.ReadPath("$projection_copy")).toEqual({});
      expect(runs).toEqual(0);
    });

    it("Without a read, projects its route's own state, without the route's projection outputs", () => {
      const tree = new DiffTree(undefined, {
        "/row/{id}": {
          projections: {
            fields: { projection: (value: any, key: string) => `${key}=${value}` },
            // Reads the keyed projection's output in the same route, without a cycle
            count: { reads: ["$projection_fields"], projection: (fields: any) => Object.keys(fields).length }
          }
        }
      });
      tree.WritePath("/row/1/a", 1);
      tree.WritePath("/row/1/b", 2);
      tree.RunProjections();
      tree.RunProjections();

      expect(tree.ReadPath("/row/1/$projection_fields")).toEqual({ a: "a=1", b: "b=2" });
      expect(tree.ReadPath("/row/1/$projection_count")).toEqual(2);
    });

    it("Chains on another keyed projection's output, running after it", () => {
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            doubled: { read: "$projection_even", projection: (value: number) => value * 2 },
            even: { read: "values", projection: (value: number) => value % 2 === 0 ? value : undefined }
          }
        }
      });
      tree.WritePath("values", { a: 1, b: 2, c: 4 });
      tree.RunProjections();
      expect(tree.ReadPath("$projection_doubled")).toEqual({ b: 4, c: 8 });

      tree.WritePath("values.b", 3);
      tree.RunProjections();
      expect(tree.ReadPath("$projection_doubled")).toEqual({ c: 8 });
    });

    it("Rejects a wildcard read when its route is created", () => {
      expect(() => new DiffTree(undefined, {
        "/": { projections: { all: { read: "/row/*/name", projection: (value: any) => value } } }
      })).toThrow(/keyed projection/);

      const tree = new DiffTree(undefined, {
        "/row/{id}": { projections: { all: { read: "/other/*/name", projection: (value: any) => value } } }
      });
      expect(() => tree.WritePath("/row/1/name", "a")).toThrow(/keyed projection/);
    });
  });

  describe("unchanged routes", () => {
    it("A run with no writes reads nothing", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { all: { reads: ["/row/*/name"], projection: (names: any) => names } } },
        "/row/{id}": { projections: { upper: { reads: ["name"], projection: (name: string) => name.toUpperCase() } } }
      });
      tree.WritePath("/row/1/name", "a");
      tree.WritePath("/row/2/name", "b");
      tree.RunProjections();
      // `all` doesn't read `upper`'s output, so it may run first and read the rows once more
      // after `upper` writes into them
      tree.RunProjections();

      const get = vi.spyOn(Snapshot, "Get");
      tree.RunProjections();
      expect(get).not.toHaveBeenCalled();
      get.mockRestore();
    });

    it("Projections sharing a route each see its change", () => {
      const runs: string[] = [];
      const tree = new DiffTree(undefined, {
        "/row/{id}": {
          projections: {
            first: { reads: ["a"], projection: (a: number) => (runs.push("first"), a) },
            second: { reads: ["a"], projection: (a: number) => (runs.push("second"), a * 2) }
          }
        }
      });
      tree.WritePath("/row/1/a", 1);
      tree.RunProjections();
      tree.WritePath("/row/1/a", 2);
      tree.RunProjections();

      // The first projection's read rebuilds the route's snapshot before the second checks it
      expect(runs).toEqual(["first", "second", "first", "second"]);
      expect(tree.ReadPath("/row/1/$projection_second")).toEqual(4);
    });

    it("A write elsewhere in the route reads again but doesn't rerun", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/row/{id}": { projections: { copy: { reads: ["a"], projection: (a: number) => (runs++, a) } } }
      });
      tree.WritePath("/row/1/a", 1);
      tree.RunProjections();
      tree.WritePath("/row/1/b", 1);
      tree.RunProjections();

      expect(runs).toEqual(1);
    });

    it("A keyed value changed through its own route reruns a projection reading it elsewhere", () => {
      const tree = new DiffTree((data: any) => data?.uid ? `/users/${data.uid}/data` : undefined, {
        "/": { projections: { name: { reads: ["item.name"], projection: (name: string) => name } } }
      });
      tree.WritePath("item", { uid: "1", name: "a" });
      tree.RunProjections();
      tree.WritePath("/users/1/data.name", "b");
      tree.RunProjections();

      expect(tree.ReadPath("$projection_name")).toEqual("b");
    });

    it("A wildcard read reads again only the match that changed", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { all: { reads: ["/row/*/name"], projection: (names: any) => names } } },
        "/row/{id}": { projections: {} }
      });
      for (let x = 0; x < 5; x++)
        tree.WritePath(`/row/${x}/name`, `n${x}`);
      tree.RunProjections();
      tree.WritePath("/row/3/name", "changed");

      // A match's read of `name` snapshots only that key
      const child = vi.spyOn(Snapshot, "Child");
      tree.RunProjections();
      expect(child).toHaveBeenCalledTimes(1);
      child.mockRestore();
      expect(tree.ReadPath("$projection_all")).toEqual({ 0: "n0", 1: "n1", 2: "n2", 3: "changed", 4: "n4" });
    });

    it("A wildcard read sees a match added, changed and deleted", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { all: { reads: ["/row/*/name"], projection: (names: any) => names } } },
        "/row/{id}": { projections: {} }
      });
      tree.WritePath("/row/1/name", "a");
      tree.RunProjections();
      tree.WritePath("/row/2/name", "b");
      tree.RunProjections();
      expect(tree.ReadPath("$projection_all")).toEqual({ 1: "a", 2: "b" });

      tree.WritePath("/row/1/name", "c");
      tree.RunProjections();
      expect(tree.ReadPath("$projection_all")).toEqual({ 1: "c", 2: "b" });

      tree.DeleteRoute("/row/2/");
      tree.RunProjections();
      expect(tree.ReadPath("$projection_all")).toEqual({ 1: "c" });
    });

    it("A read of a route that doesn't exist yet runs once it's written", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["/row/1/name"], projection: (name: string) => name } } },
        "/row/{id}": { projections: {} }
      });
      tree.RunProjections();
      tree.WritePath("/row/1/name", "a");
      tree.RunProjections();

      expect(tree.ReadPath("$projection_copy")).toEqual("a");
    });
  });

  describe("delete route", () => {
    it("Deletes the route's state and instance, leaving siblings", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.WritePath("/channel/1/name", "a");
      tree.WritePath("/channel/10/name", "b");
      tree.DeleteRoute("/channel/1/");

      expect(tree.ReadPath("/channel/1/name")).toBeUndefined();
      expect(tree.ReadPath("/channel/10/name")).toEqual("b");
      expect(Children(RootRoute(tree)).map((r: any) => r.parts)).toEqual([["channel", "10"]]);
    });

    it("Deletes child routes with their parent", () => {
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: {}, routes: { "/user/{userId}": { projections: {} } } }
      });
      tree.WritePath("/channel/1/user/u1/name", "a");
      tree.DeleteRoute("/channel/1/");
      tree.WritePath("/channel/1/name", "b");

      expect(tree.ReadPath("/channel/1/user/u1/name")).toBeUndefined();
      expect(Children(Children(RootRoute(tree))[0]).length).toEqual(0);
    });

    it("Deleted route's projections stop running and run again once it's rewritten", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/channel/{id}": { projections: { upper: { reads: ["name"], projection: (name: string) => (runs++, name.toUpperCase()) } } }
      });
      tree.WritePath("/channel/1/name", "a");
      tree.WritePath("/channel/2/name", "b");
      tree.RunProjections();
      tree.DeleteRoute("/channel/1/");
      tree.DeleteRoute("/channel/2/");
      tree.RunProjections();
      expect(runs).toEqual(2);

      tree.WritePath("/channel/1/name", "c");
      tree.RunProjections();
      expect(runs).toEqual(3);
      expect(tree.ReadPath("/channel/1/$projection_upper")).toEqual("C");
    });

    it("Wildcard read drops a deleted route", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { names: { reads: ["/rows/row_*/name"], projection: (names: any) => names } } }
      });
      tree.WritePath("/rows/row_1/name", "a");
      tree.WritePath("/rows/row_2/name", "b");
      tree.RunProjections();
      tree.DeleteRoute("/rows/row_1/");
      tree.RunProjections();

      expect(tree.ReadPath("$projection_names")).toEqual({ row_2: "b" });
    });

    it("Invalidates snapshots that read a keyed value through the deleted route", () => {
      const tree = new DiffTree((data: any) => data?.uid ? `/users/${data.uid}/data` : undefined);
      tree.WritePath("item", { uid: "1", name: "a" });
      const before = tree.Snapshot("item");
      tree.DeleteRoute("/users/1/");

      expect(tree.ReadPath("/users/1/data")).toBeUndefined();
      expect(tree.Snapshot("item")).not.toBe(before);
      expect(tree.Snapshot("item")).toEqual({ uid: "1", name: "a" });
    });

    it("Deleting a route that doesn't exist does nothing", () => {
      const tree = new DiffTree();
      tree.WritePath("a", 1);

      expect(() => tree.DeleteRoute("/missing/1/")).not.toThrow();
      expect(tree.ReadPath("a")).toEqual(1);
    });

    it("Root and property paths throw", () => {
      const tree = new DiffTree();

      expect(() => tree.DeleteRoute("/")).toThrow(/non-root route/);
      expect(() => tree.DeleteRoute("/channel/1/name")).toThrow(/non-root route/);
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

  describe("outputs the same as the last", () => {
    it("Keeps the last output when a projection's new one is the same, so a projection reading it is skipped", () => {
      const runs: string[] = [];
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            copy: { reads: ["a"], projection: (a: any) => (runs.push("copy"), { x: { n: a.n } }) },
            reader: { reads: ["$projection_copy.x"], projection: (x: any) => (runs.push("reader"), x.n) }
          }
        }
      });
      tree.WritePath("a", { n: 1, pos: 0 });
      tree.RunProjections();
      const before = tree.ReadPath("$projection_copy");

      tree.WritePath("a.pos", 1);
      tree.RunProjections();
      expect(runs).toEqual(["copy", "reader", "copy"]);
      expect(tree.ReadPath("$projection_copy")).toBe(before);

      tree.WritePath("a.n", 2);
      tree.RunProjections();
      expect(runs).toEqual(["copy", "reader", "copy", "copy", "reader"]);
      expect(tree.ReadPath("$projection_reader")).toBe(2);
    });

    it("Keeps a keyed entry's last output when its new one is the same", () => {
      const runs: string[] = [];
      const tree = new DiffTree(undefined, {
        "/": {
          projections: {
            names: { read: "rows", projection: (row: any) => ({ name: row.name }) },
            reader: { reads: ["$projection_names"], projection: (names: any) => (runs.push("reader"), Object.keys(names).length) }
          }
        }
      });
      tree.WritePath("rows", { a: { name: "x", pos: 0 }, b: { name: "y", pos: 0 } });
      tree.RunProjections();
      const before = tree.ReadPath("$projection_names") as any;

      tree.WritePath("rows.a.pos", 1);
      tree.RunProjections();
      expect(tree.ReadPath("$projection_names")).toBe(before);
      expect(runs).toEqual(["reader"]);

      tree.WritePath("rows.b.name", "z");
      tree.RunProjections();
      const after = tree.ReadPath("$projection_names") as any;
      expect(after.a).toBe(before.a);
      expect(after.b).toEqual({ name: "z" });
      expect(runs).toEqual(["reader", "reader"]);
    });
  });

  describe("path-scoped reads", () => {
    it("Doesn't snapshot the route or rerun for a write to the route's other keys", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["a.b"], projection: (b: any) => (runs++, b) } } }
      });
      tree.WritePath("a", { b: 1 });
      tree.WritePath("other", 1);
      tree.RunProjections();

      tree.WritePath("other", 2);
      const get = vi.spyOn(Snapshot, "Get");
      const child = vi.spyOn(Snapshot, "Child");
      tree.RunProjections();
      expect(get).not.toHaveBeenCalled();
      expect(child).not.toHaveBeenCalled();
      get.mockRestore();
      child.mockRestore();
      expect(runs).toBe(1);
    });

    it("Reruns when the key read is written with a new value, or under a keyed entity it holds", () => {
      const seen: any[] = [];
      const tree = new DiffTree((value: any) => value?.id, {
        "/": { projections: { copy: { reads: ["list"], projection: (list: any) => (seen.push(list), list.length) } } }
      });
      tree.WritePath("list", [{ id: "e1", n: 1 }]);
      tree.RunProjections();

      tree.WritePath("list", [{ id: "e1", n: 1 }, { id: "e2", n: 2 }]);
      tree.RunProjections();
      tree.WritePath("e1.n", 5);
      tree.RunProjections();
      expect(seen).toEqual([
        [{ id: "e1", n: 1 }],
        [{ id: "e1", n: 1 }, { id: "e2", n: 2 }],
        [{ id: "e1", n: 5 }, { id: "e2", n: 2 }],
      ]);
    });

    it("Doesn't read again after a projection writes its output into the route it reads", () => {
      let runs = 0;
      const tree = new DiffTree(undefined, {
        "/": { projections: { copy: { reads: ["a"], projection: (a: any) => (runs++, { a }) } } }
      });
      tree.WritePath("a", { n: 1 });
      tree.RunProjections();

      const child = vi.spyOn(Snapshot, "Child");
      tree.RunProjections();
      expect(child).not.toHaveBeenCalled();
      child.mockRestore();
      expect(runs).toBe(1);
    });
  });

  describe("deletes", () => {
    it("Writing a record without a key deletes it in place and commits a delete", () => {
      const tree: any = new DiffTree();
      tree.WritePath("positions", { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } });
      tree.Commit();
      const record = tree.rootState.positions;
      const a = tree.rootState.positions.a;
      tree.WritePath("positions", { a: { x: 1, y: 1 } });

      expect(tree.rootState.positions).toBe(record);
      expect(tree.rootState.positions.a).toBe(a);
      expect(Object.hasOwn(record, "b")).toBe(false);
      expect(tree.Snapshot("positions")).toEqual({ a: { x: 1, y: 1 } });
      expect(tree.Commit()).toEqual([{ type: "delete", path: ["positions", "b"] }]);
    });

    it("A deleted key reruns a projection reading the record", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { count: { reads: ["record"], projection: (record: any) => Object.keys(record).length } } }
      });
      tree.WritePath("record", { a: 1, b: 2 });
      tree.RunProjections();
      tree.WritePath("record", { a: 1 });
      tree.RunProjections();

      expect(tree.ReadPath("$projection_count")).toEqual(1);
    });

    it("A projection output that lost an entry commits a delete for it alone", () => {
      const tree = new DiffTree(undefined, {
        "/": { projections: { byName: { reads: ["names"], projection: (names: string[]) => Object.fromEntries(names.map(n => [n, { n }])) } } }
      });
      tree.WritePath("names", ["a", "b", "c"]);
      tree.RunProjections();
      tree.Commit();
      tree.WritePath("names", ["a", "c"]);
      tree.RunProjections();

      expect(tree.Commit()).toEqual(expect.arrayContaining([{ type: "delete", path: ["$projection_byName", "b"] }]));
      expect(tree.Commit()).toEqual([]);
    });
  });
});
