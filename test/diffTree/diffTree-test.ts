import { describe, expect, it } from "vitest";
import { DiffTree } from '../../src/Store/Diff/diffTree_v2';

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
    it("First commit returns the whole root state", () => {
      const tree = new DiffTree();

      expect(tree.Commit()).toEqual([{ path: [], value: {} }]);
    });

    it("Commit returns the writes since the last commit", () => {
      const tree = new DiffTree();
      tree.Commit();
      tree.WritePath("value", { a: 1, b: 2 });

      expect(tree.Commit()).toEqual([{ path: ["value"], value: { a: 1, b: 2 } }]);
    });

    it("Commit returns only the changed part of a value", () => {
      const tree = new DiffTree();
      tree.WritePath("value", { a: 1, b: 2 });
      tree.Commit();
      tree.WritePath("value.a", 5);

      expect(tree.Commit()).toEqual([{ path: ["value", "a"], value: 5 }]);
    });

    it("Commit returns every write in the batch", () => {
      const tree = new DiffTree();
      tree.Commit();
      tree.WritePath("x", 1);
      tree.WritePath("y", 2);

      expect(tree.Commit()).toEqual([{ path: ["x"], value: 1 }, { path: ["y"], value: 2 }]);
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

      expect(tree.Commit()).toEqual([{ path: ["value"] }]);
    });

    it("Commit excludes route state", () => {
      const tree = new DiffTree(undefined, { "/channel/{id}": { projections: {} } });
      tree.Commit();
      tree.WritePath("/channel/1/name", "test");

      expect(tree.Commit()).toEqual([]);
    });

    it("Commit includes a keyed entity written to the root", () => {
      const tree = new DiffTree(keyFunc);
      tree.Commit();
      tree.WritePath("value", { item: { id: "MY_ID", v: 1 } });

      expect(tree.Commit()).toEqual(expect.arrayContaining([
        { path: ["MY_ID"], value: { id: "MY_ID", v: 1 } },
        { path: ["value"], value: { item: { id: "MY_ID", v: 1 } } }
      ]));
    });
  });
});
