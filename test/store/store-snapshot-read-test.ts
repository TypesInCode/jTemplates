import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope, PeekCallback as peek } from "../../src/Store/Tree/observableScope";

// `GetSnapshot(key)`: a root read as plain data (`ObservableNode.Snapshot`) whose reader wakes on
// every post that lands in the root (docs/proposals/store-snapshot-read.md). A plain snapshot of
// `Get(key)` registers only the root property, which a diff applied inside the root doesn't
// replace, so its reader never wakes.

function KeyFunc(val: any) {
  return val?._id;
}

/** A scope that counts its evaluations, read once */
function track<T>(fn: () => T) {
  let runs = 0;
  const scope = ObservableScope.Create(() => {
    runs++;
    return fn();
  });
  ObservableScope.Value(scope);
  return {
    value: () => ObservableScope.Value(scope),
    runs: () => runs,
    destroy: () => ObservableScope.Destroy(scope),
  };
}

function isProxy(value: unknown) {
  return ObservableNode.Unwrap(value) !== value;
}

describe("GetSnapshot: the value", () => {
  it("returns the root as plain data, not a proxy", () => {
    const store = new StoreSync();
    store.Write({ records: { a: { n: 1 } }, list: [1, 2] }, "root");

    const snapshot = store.GetSnapshot<any>("root");

    expect(snapshot).toEqual({ records: { a: { n: 1 } }, list: [1, 2] });
    expect(isProxy(snapshot)).toBe(false);
    expect(isProxy(snapshot.records)).toBe(false);
    expect(isProxy(snapshot.records.a)).toBe(false);
    expect(Array.isArray(snapshot.list)).toBe(true);
  });

  it("returns the same object on each read while the root is unchanged", () => {
    const store = new StoreSync();
    store.Write({ a: { n: 1 } }, "root");

    expect(store.GetSnapshot("root")).toBe(store.GetSnapshot("root"));
  });

  it("shares what a post didn't change with the last snapshot", () => {
    const store = new StoreSync();
    store.Write({ a: { n: 1 }, b: { n: 2 } }, "root");
    const before = store.GetSnapshot<any>("root");

    store.Patch("root.a", { n: 5 });
    const after = store.GetSnapshot<any>("root");

    expect(after).not.toBe(before);
    expect(after.a).not.toBe(before.a);
    expect(after.a.n).toBe(5);
    expect(after.b).toBe(before.b);
    // The earlier snapshot is left as it was
    expect(before.a.n).toBe(1);
  });

  it("reads a root the store doesn't hold as undefined", () => {
    const store = new StoreSync();

    expect(store.GetSnapshot("missing")).toBe(undefined);
  });

  it("creates a missing root with the default, as Get does", () => {
    const store = new StoreSync();

    const snapshot = store.GetSnapshot("root", { items: [] as number[] });

    expect(snapshot).toEqual({ items: [] });
    expect(isProxy(snapshot)).toBe(false);
    expect(store.Has("root")).toBe(true);
  });

  it("returns a value root as it is", () => {
    const store = new StoreSync();
    store.Write(5, "count");
    store.Write("text", "label");

    expect(store.GetSnapshot("count")).toBe(5);
    expect(store.GetSnapshot("label")).toBe("text");
  });

  it("returns an opaque root's raw value", () => {
    const store = new StoreSync(undefined, { opaque: ["view"] });
    const view = { nodes: [{ id: "n1" }] };
    store.Write(view, "view");

    const snapshot = store.GetSnapshot<any>("view");

    expect(snapshot).toEqual(view);
    expect(snapshot).toBe(store.Get("view"));
  });

  it("resolves a keyed child through its own root", () => {
    const store = new StoreSync(undefined, { keyFunc: KeyFunc });
    store.Write({ owner: { _id: "u1", name: "A" } }, "doc");

    store.Patch("u1", { name: "B" });

    expect(store.GetSnapshot<any>("doc").owner.name).toBe("B");
  });
});

describe("GetSnapshot: waking its reader", () => {
  it("wakes on a Patch deep inside the root", () => {
    const store = new StoreSync();
    store.Write({ records: { a: { n: 1 } } }, "root");
    const reader = track(() => store.GetSnapshot<any>("root").records.a.n);
    expect(reader.value()).toBe(1);

    store.Patch("root.records.a", { n: 2 });

    expect(reader.value()).toBe(2);
    expect(reader.runs()).toBe(2);
    reader.destroy();
  });

  it("wakes on a whole-root Write diffed in place", () => {
    const store = new StoreSync();
    store.Write({ records: { a: "a" } }, "root");
    const reader = track(() => store.GetSnapshot<any>("root").records.a);

    store.Write({ records: { a: "b" } }, "root");

    expect(reader.value()).toBe("b");
    reader.destroy();
  });

  it("wakes on Push and Splice inside the root", () => {
    const store = new StoreSync();
    store.Write({ list: [1, 2, 3] }, "root");
    const reader = track(() => store.GetSnapshot<any>("root").list.join(","));

    store.Push("root.list", 4);
    expect(reader.value()).toBe("1,2,3,4");

    store.Splice("root.list", 0, 1);
    expect(reader.value()).toBe("2,3,4");
    reader.destroy();
  });

  it("wakes a reader that touches no field, only the snapshot", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "root");
    const reader = track(() => store.GetSnapshot<any>("root"));
    const first = reader.value();

    store.Patch("root", { a: 2 });

    expect(reader.value()).not.toBe(first);
    expect(reader.value()).toEqual({ a: 2 });
    expect(reader.runs()).toBe(2);
    reader.destroy();
  });

  it("wakes once for a post that changes many paths in the root", () => {
    const store = new StoreSync();
    store.Write({ a: 1, b: 2, c: { d: 3 } }, "root");
    const reader = track(() => store.GetSnapshot<any>("root"));

    store.Patch("root", { a: 10, b: 20, c: { d: 30 } });

    expect(reader.value()).toEqual({ a: 10, b: 20, c: { d: 30 } });
    expect(reader.runs()).toBe(2);
    reader.destroy();
  });

  it("doesn't wake for a post to another root", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "one");
    store.Write({ a: 1 }, "two");
    const reader = track(() => store.GetSnapshot<any>("one").a);

    store.Patch("two", { a: 2 });
    reader.value();

    expect(reader.runs()).toBe(1);
    reader.destroy();
  });

  it("doesn't wake for a write that changes nothing", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "root");
    const reader = track(() => store.GetSnapshot<any>("root").a);

    store.Write({ a: 1 }, "root");
    reader.value();

    expect(reader.runs()).toBe(1);
    reader.destroy();
  });

  it("wakes when a root read before it existed is first written", () => {
    const store = new StoreSync();
    const reader = track(() => store.GetSnapshot<any>("root")?.a ?? null);
    expect(reader.value()).toBe(null);

    store.Write({ a: 1 }, "root");

    expect(reader.value()).toBe(1);
    reader.destroy();
  });

  it("wakes when a root read with a default is first written", () => {
    const store = new StoreSync();
    const reader = track(() => store.GetSnapshot<any>("root", { a: 0 }).a);
    expect(reader.value()).toBe(0);

    store.Write({ a: 1 }, "root");

    expect(reader.value()).toBe(1);
    reader.destroy();
  });

  it("wakes when an opaque root is written again", () => {
    const store = new StoreSync(undefined, { opaque: ["view"] });
    store.Write({ v: 1 }, "view");
    const reader = track(() => store.GetSnapshot<any>("view").v);

    store.Write({ v: 2 }, "view");

    expect(reader.value()).toBe(2);
    reader.destroy();
  });

  it("registers nothing when read outside a scope", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "root");
    let runs = 0;
    const scope = ObservableScope.Create(() => {
      runs++;
      return ObservableScope.Peek(ObservableScope.Create(() => store.GetSnapshot<any>("root").a));
    });
    ObservableScope.Value(scope);

    store.Patch("root", { a: 2 });
    ObservableScope.Value(scope);

    expect(runs).toBe(1);
    ObservableScope.Destroy(scope);
  });

  it("keeps the proxy readers' granularity: a reader of one field doesn't wake for another", () => {
    const store = new StoreSync();
    store.Write({ a: 1, b: 1 }, "root");
    const snapshotReader = track(() => store.GetSnapshot<any>("root"));
    const fieldReader = track(() => store.Get<any>("root").a);

    store.Patch("root", { b: 2 });
    snapshotReader.value();
    fieldReader.value();

    expect(snapshotReader.runs()).toBe(2);
    expect(fieldReader.runs()).toBe(1);
    snapshotReader.destroy();
    fieldReader.destroy();
  });

  // Demand roots (StoreAsync's `demand`) are built on the store watch: a snapshot read in a scope
  // must count as a reactive read of the root, or a demand root read this way is never subscribed.
  it("tells a store watch the root gained, then lost, a reactive reader", () => {
    const events: [string, number][] = [];
    const store = new StoreSync(undefined, { watch: ["root"], watchCallback: (key, event) => events.push([key, event]) });
    const reader = track(() => store.GetSnapshot<any>("root", { a: 0 }).a);

    expect(events).toEqual([["root", 0]]);
    reader.destroy();
    expect(events).toEqual([["root", 0], ["root", 1]]);
  });

  // A parent's cached snapshot embeds its keyed child's, so a post to the child's root
  // invalidates the parent's snapshot too, and that wakes the parent's reader.
  it("wakes a parent's reader when a keyed child's root changes", () => {
    const store = new StoreSync(undefined, { keyFunc: KeyFunc });
    store.Write({ owner: { _id: "u1", name: "A" } }, "doc");
    const reader = track(() => store.GetSnapshot<any>("doc").owner.name);

    store.Patch("u1", { name: "B" });

    expect(reader.value()).toBe("B");
    expect(reader.runs()).toBe(2);
    reader.destroy();
  });
});

// The reactivity lives on the node, so a snapshot of any node, not only a store root, wakes its
// reader when something under that node changes, and only then.
describe("ObservableNode.Snapshot of a node inside a root", () => {
  it("wakes its reader on a change under the node", () => {
    const store = new StoreSync();
    store.Write({ a: { b: { c: 1 } }, x: 1 }, "root");
    const reader = track(() => ObservableNode.Snapshot(store.Get<any>("root").a).b.c);

    store.Patch("root.a.b", { c: 2 });

    expect(reader.value()).toBe(2);
    reader.destroy();
  });

  it("doesn't wake its reader for a change outside the node", () => {
    const store = new StoreSync();
    store.Write({ a: { b: 1 }, x: 1 }, "root");
    const reader = track(() => ObservableNode.Snapshot(store.Get<any>("root").a));

    store.Patch("root", { x: 2 });
    reader.value();

    expect(reader.runs()).toBe(1);
    reader.destroy();
  });

  it("wakes on each post, whether or not the reader read in between", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "root");
    const reader = track(() => store.GetSnapshot<any>("root").a);

    store.Patch("root", { a: 2 });
    store.Patch("root", { a: 3 });
    expect(reader.value()).toBe(3);

    store.Patch("root", { a: 4 });
    expect(reader.value()).toBe(4);
    reader.destroy();
  });

  it("registers nothing when read through peek", () => {
    const store = new StoreSync();
    store.Write({ a: 1 }, "root");
    const reader = track(() => peek(() => store.GetSnapshot<any>("root").a));
    const nodeReader = track(() => peek(() => ObservableNode.Snapshot(store.Get<any>("root"))!.a));

    store.Patch("root", { a: 2 });
    reader.value();
    nodeReader.value();

    expect(reader.runs()).toBe(1);
    expect(nodeReader.runs()).toBe(1);
    reader.destroy();
    nodeReader.destroy();
  });

  // Serializing a node is not a snapshot read: it registers nothing.
  it("registers nothing for JSON.stringify or toJSON", () => {
    const node = ObservableNode.Create({ a: 1 });
    const reader = track(() => JSON.stringify(node) + JSON.stringify((node as any).toJSON()));

    node.a = 2;
    reader.value();

    expect(reader.runs()).toBe(1);
    reader.destroy();
  });
});

// `ObservableNode.JSON`: the snapshot `Snapshot` returns, read without subscribing.
describe("ObservableNode.JSON", () => {
  it("returns the same cached object as Snapshot", () => {
    const store = new StoreSync();
    store.Write({ a: { n: 1 }, list: [1, 2] }, "root");
    const root = store.Get<any>("root");

    const json = ObservableNode.JSON(root);

    expect(json).toEqual({ a: { n: 1 }, list: [1, 2] });
    expect(isProxy(json)).toBe(false);
    expect(json).toBe(ObservableNode.Snapshot(root));
    expect(ObservableNode.JSON(root.list)).toBe(json!.list);
  });

  it("reflects a write on the next read, sharing what didn't change", () => {
    const store = new StoreSync();
    store.Write({ a: { n: 1 }, b: { n: 1 } }, "root");
    const before = ObservableNode.JSON(store.Get<any>("root"));

    store.Patch("root.a", { n: 2 });
    const after = ObservableNode.JSON(store.Get<any>("root"));

    expect(after.a.n).toBe(2);
    expect(after.b).toBe(before.b);
  });

  it("registers nothing in the scope that reads it", () => {
    const store = new StoreSync();
    store.Write({ a: { n: 1 } }, "root");
    const root = store.Get<any>("root");
    const reader = track(() => ObservableNode.JSON(root).a.n);
    const arrayNode = ObservableNode.Create({ list: [1] });
    const arrayReader = track(() => ObservableNode.JSON(arrayNode.list)!.length);

    store.Patch("root.a", { n: 2 });
    arrayNode.list.push(2);
    reader.value();
    arrayReader.value();

    expect(reader.runs()).toBe(1);
    expect(arrayReader.runs()).toBe(1);
    reader.destroy();
    arrayReader.destroy();
  });

  it("doesn't wake a Snapshot reader of the same node, nor stop it waking", () => {
    const node = ObservableNode.Create({ a: 1 });
    const reader = track(() => ObservableNode.Snapshot(node)!.a);

    ObservableNode.JSON(node);
    node.a = 2;
    ObservableNode.JSON(node);
    node.a = 3;

    expect(reader.value()).toBe(3);
    reader.destroy();
  });

  it("returns undefined for a value that isn't a node", () => {
    expect(ObservableNode.JSON({ a: 1 })).toBe(undefined);
    expect(ObservableNode.JSON(5)).toBe(undefined);
  });
});

describe("ObservableNode.Snapshot of a node outside a store", () => {
  it("wakes a node created with ObservableNode.Create, outside any store", () => {
    const node = ObservableNode.Create({ list: [{ n: 1 }] });
    const reader = track(() => ObservableNode.Snapshot(node)!.list[0].n);

    node.list[0].n = 2;

    expect(reader.value()).toBe(2);
    reader.destroy();
  });
});
