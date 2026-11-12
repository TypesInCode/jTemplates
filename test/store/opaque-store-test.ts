import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import type { IRouteDefinitions } from "../../src/Store/Diff";

// Opaque roots: a store holds a root listed in its `opaque` option whole, and its DiffTree
// writes that root whole instead of diffing inside it.

function drawing(label = "a") {
  return {
    label,
    nodes: [{ id: "n1", rect: { x: 0, y: 0 } }, { id: "n2", rect: { x: 10, y: 0 } }],
  };
}

function isNode(value: any) {
  return ObservableNode.Snapshot(value) !== undefined;
}

function counted<T>(read: () => T) {
  const state = { runs: 0 };
  const scope = ObservableScope.Create(() => {
    state.runs++;
    return read();
  });
  return { scope, state };
}

describe("DiffTree opaque keys", () => {
  it("commits a change inside an opaque key as one write of the whole value", () => {
    const tree = new DiffTree();
    tree.MarkOpaque(["view"]);
    tree.WritePath("view", drawing());
    tree.Commit();

    tree.WritePath("view.nodes.0.rect.x", 5);
    const diff = tree.Commit();
    expect(diff.length).to.eq(1);
    expect(diff[0].type).to.eq("write");
    expect(diff[0].path).to.deep.eq(["view"]);
    expect((diff[0] as any).value.nodes[0].rect.x).to.eq(5);
  });

  it("still diffs inside a key that isn't marked", () => {
    const tree = new DiffTree();
    tree.MarkOpaque(["view"]);
    tree.WritePath("other", drawing());
    tree.Commit();

    tree.WritePath("other.nodes.0.rect.x", 5);
    const diff = tree.Commit();
    expect(diff).to.deep.eq([{ type: "write", path: ["other", "nodes", 0, "rect", "x"], value: 5 }]);
  });

  it("commits nothing for an opaque key no write changed", () => {
    const tree = new DiffTree();
    tree.MarkOpaque(["view"]);
    tree.WritePath("view", drawing());
    tree.Commit();

    tree.WritePath("other", 1);
    expect(tree.Commit()).to.deep.eq([{ type: "write", path: ["other"], value: 1 }]);
  });

  it("writes an opaque projection output whole", () => {
    const routes: IRouteDefinitions = {
      "/": { projections: { view: { reads: ["source"], projection: (source: any) => ({ ...drawing(), source }) } } },
    };
    const tree = new DiffTree(undefined, routes);
    tree.MarkOpaque(["$projection_view"]);
    tree.WritePath("source", 1);
    tree.RunProjections();
    tree.Commit();

    tree.WritePath("source", 2);
    tree.RunProjections();
    const diff = tree.Commit();
    const view = diff.find((d) => d.path[0] === "$projection_view")!;
    expect(view.path).to.deep.eq(["$projection_view"]);
    expect((view as any).value.source).to.eq(2);
  });
});

describe("StoreSync opaque roots", () => {
  it("reads an opaque root as a raw value, never proxied", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");

    const view = store.Get<any>("view");
    expect(isNode(view)).to.eq(false);
    expect(isNode(view.nodes)).to.eq(false);
    expect(view.nodes[0].rect.x).to.eq(0);
    expect(store.Get("view")).to.eq(view);
  });

  it("still proxies a root that isn't listed", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "other");
    expect(isNode(store.Get("other"))).to.eq(true);
  });

  it("replaces the value whole on a change inside it, and re-runs its readers", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");
    const first = store.Get<any>("view");
    const { scope, state } = counted(() => store.Get<any>("view"));
    expect(ObservableScope.Value(scope)).to.eq(first);

    store.Write(20, "view.nodes.1.rect.x");
    const second = ObservableScope.Value(scope);
    expect(second).not.to.eq(first);
    expect(second.nodes[1].rect.x).to.eq(20);
    expect(first.nodes[1].rect.x).to.eq(10);
    expect(state.runs).to.eq(2);
    ObservableScope.Destroy(scope);
  });

  it("doesn't re-run its readers on a write that changes nothing", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");
    const { scope, state } = counted(() => store.Get<any>("view"));
    ObservableScope.Value(scope);

    store.Write(drawing(), "view");
    store.Write(10, "view.nodes.1.rect.x");
    ObservableScope.Value(scope);
    expect(state.runs).to.eq(1);
    ObservableScope.Destroy(scope);
  });

  it("doesn't re-run its readers when another root changes", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");
    const { scope, state } = counted(() => store.Get<any>("view"));
    ObservableScope.Value(scope);

    store.Write(1, "other");
    ObservableScope.Value(scope);
    expect(state.runs).to.eq(1);
    ObservableScope.Destroy(scope);
  });

  it("Patch and Push on an opaque root replace it whole", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view", "list"] });
    store.Write(drawing(), "view");
    store.Write([1, 2], "list");
    const view = store.Get<any>("view");
    const list = store.Get<any>("list");

    store.Patch("view", { label: "patched" });
    store.Push("list", 3);
    expect(store.Get<any>("view")).not.to.eq(view);
    expect(store.Get<any>("view").label).to.eq("patched");
    expect(store.Get<any>("view").nodes.length).to.eq(2);
    expect(store.Get<any>("list")).to.deep.eq([1, 2, 3]);
    expect(isNode(store.Get("list"))).to.eq(false);
    expect(list).to.deep.eq([1, 2]);
  });

  it("holds a primitive opaque root as it is", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["text"] });
    store.Write("json", "text");
    expect(store.Get("text")).to.eq("json");
  });

  it("reads a default given before the first write raw, and updates its reader on the write", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    const empty = { label: "empty", nodes: [] };
    const { scope } = counted(() => store.Get<any>("view", empty));
    expect(ObservableScope.Value(scope)).to.eq(empty);

    store.Write(drawing("written"), "view");
    expect(ObservableScope.Value(scope).label).to.eq("written");
    expect(isNode(ObservableScope.Value(scope))).to.eq(false);
    ObservableScope.Destroy(scope);
  });

  it("holds an opaque projection output whole", () => {
    const routes: IRouteDefinitions = {
      "/": { projections: { view: { reads: ["source"], projection: (source: any) => ({ ...drawing(), source }) } } },
    };
    const store = new StoreSync(undefined, routes, { opaque: ["$projection_view"] });
    store.Write(1, "source");
    const first = store.Get<any>("$projection_view");
    expect(isNode(first)).to.eq(false);
    expect(first.source).to.eq(1);

    store.Write(2, "source");
    const second = store.Get<any>("$projection_view");
    expect(second).not.to.eq(first);
    expect(second.source).to.eq(2);
  });

  it("snapshots and serializes an opaque root as its raw value", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");
    expect(JSON.parse(JSON.stringify(store.Get("view")))).to.deep.eq(drawing());
  });

  it("refuses to read an opaque root through a key", () => {
    const store = new StoreSync((v: any) => v?._id, undefined, { opaque: ["a"] });
    store.Write([{ _id: "a", v: 1 }], "list");
    expect(() => store.Get<any>("list")[0].v).to.throw(/can't be read through a key/);
  });

  it("throws on a diff inside an opaque root, from a DiffTree that wasn't told", () => {
    const store = new StoreSync(undefined, undefined, { opaque: ["view"] });
    store.Write(drawing(), "view");
    expect(() => (store as any).UpdateRootMap([{ type: "write", path: ["view", "label"], value: "b" }]))
      .to.throw(/DiffTree.MarkOpaque/);
  });
});
