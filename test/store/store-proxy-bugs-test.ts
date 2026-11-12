import { describe, it, expect } from "vitest";
import { ReadStore } from "../../src/Store/Store/store";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { DiffTreePublisher } from "../../src/Store/Diff/diffTreePublisher";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

// The cases in docs/bugs/observable-node-proxy-own-keys.md. Each asserts the fixed behaviour.

const DIFF_TREE_EVENT = "diff";

/** A read-only store that applies the diffs dispatched to it, as a pushed store does */
class DiffStore extends ReadStore {
  constructor(target: EventTarget) {
    super();
    target.addEventListener("message", (event) => {
      const data = (event as MessageEvent).data;
      data?.type === DIFF_TREE_EVENT && this.UpdateRootMap(data.data);
    });
  }
}

/** A pushed store and a function that posts one change to it, synchronously. */
function Push() {
  const target = new EventTarget();
  const store = new DiffStore(target);
  const post = (path: string[], value: unknown) =>
    target.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DIFF_TREE_EVENT, data: [{ type: "write", path, value }] },
      }),
    );
  return { store, post };
}

describe("Object.hasOwn on a store proxy (issue 1)", () => {
  it("is false for a key the object doesn't have", () => {
    const proxy = ObservableNode.Create({ a: { x: 1 } });
    expect(Object.hasOwn(proxy, "a")).toBe(true);
    expect(Object.hasOwn(proxy, "missing")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(proxy, "missing")).toBe(false);
    expect(Object.getOwnPropertyDescriptor(proxy, "missing")).toBeUndefined();
  });

  it("is false for a missing index of an array", () => {
    const proxy = ObservableNode.Create({ list: [1, 2] }).list;
    expect(Object.hasOwn(proxy, "1")).toBe(true);
    expect(Object.hasOwn(proxy, "5")).toBe(false);
  });

  it("is false for a key a pushed store's root doesn't have", () => {
    const { store, post } = Push();
    post(["r"], { a: { x: 1 } });
    expect(Object.hasOwn(store.Get<any>("r"), "a")).toBe(true);
    expect(Object.hasOwn(store.Get<any>("r"), "missing")).toBe(false);
  });

  it("wakes a scope that tested a key when the key is added and removed", () => {
    const { store, post } = Push();
    post(["r"], { a: 1 });
    const scope = ObservableScope.Create(() => Object.hasOwn(store.Get<any>("r"), "b"));
    expect(ObservableScope.Value(scope)).toBe(false);

    post(["r", "b"], 2);
    expect(ObservableScope.Value(scope)).toBe(true);

    post(["r"], { a: 1 });
    expect(ObservableScope.Value(scope)).toBe(false);
    ObservableScope.Destroy(scope);
  });
});

// Array wrappers have no ITERATOR_SCOPE (their scope is OBJECT_SCOPE), but the `has` and `ownKeys`
// array traps touch ITERATOR_SCOPE. Each reader holds the array's own proxy, so only the array's
// scope can wake it.
describe("membership and key reads on an array proxy wake when the array changes", () => {
  function Reader(read: (list: number[]) => unknown) {
    const list: number[] = ObservableNode.Create({ list: [1, 2] }).list;
    const scope = ObservableScope.Create(() => read(list));
    return { list, scope };
  }

  it.each([
    ["an element read (control)", (list: number[]) => list[2]],
    ["length", (list: number[]) => list.length],
    ["`in`", (list: number[]) => 2 in list],
    ["Object.keys", (list: number[]) => {
      const length = Object.keys(list).length;
      return length;
    }],
    ["Object.hasOwn", (list: number[]) => Object.hasOwn(list, 2)],
  ] as const)("%s, after a push", (_name, read) => {
    const { list, scope } = Reader(read);
    const before = ObservableScope.Value(scope);
    list.push(3);
    expect(ObservableScope.Value(scope)).not.toEqual(before);
    ObservableScope.Destroy(scope);
  });

  it.each([
    ["`in`", (list: number[]) => 2 in list],
    ["Object.keys", (list: number[]) => Object.keys(list).length],
    ["Object.hasOwn", (list: number[]) => Object.hasOwn(list, 2)],
  ] as const)("%s, after an element is written by a diff", (_name, read) => {
    const { list, scope } = Reader(read);
    const before = ObservableScope.Value(scope);
    ObservableNode.ApplyDiff(list, [{ type: "write", path: ["2"], value: 3 }]);
    expect(ObservableScope.Value(scope)).not.toEqual(before);
    ObservableScope.Destroy(scope);
  });

  // The wrapper is an empty array with a `length` of its own; a descriptor reports the array's.
  it("reports the array's own descriptors, length included", () => {
    const list: number[] = ObservableNode.Create({ list: [1, 2, 3] }).list;
    expect(Object.getOwnPropertyDescriptor(list, "length")).toEqual({
      value: 3,
      writable: true,
      enumerable: false,
      configurable: false,
    });
    expect(Object.getOwnPropertyDescriptor(list, "1")?.value).toBe(2);
    expect(Reflect.ownKeys(list)).toEqual(["0", "1", "2", "length"]);
  });
});

describe("keys named like Object.prototype members (issue 2)", () => {
  const NAMES = ["constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf", "toLocaleString"];

  it.each(NAMES)("reads %s as the object's own value", (name) => {
    const proxy = ObservableNode.Create({ [name]: { v: 1 } });
    expect(proxy[name]).toBeDefined();
    expect(proxy[name].v).toBe(1);
  });

  it("reads them through a pushed store, as JSON shows them", () => {
    const { store, post } = Push();
    post(["r"], { toString: { v: 1 }, constructor: { v: 2 }, hasOwnProperty: { v: 3 } });
    const r = store.Get<any>("r");
    expect(JSON.parse(JSON.stringify(r))).toEqual({ toString: { v: 1 }, constructor: { v: 2 }, hasOwnProperty: { v: 3 } });
    expect(r.toString?.v).toBe(1);
    expect(r.constructor?.v).toBe(2);
    expect(r.hasOwnProperty?.v).toBe(3);
  });

  it("wakes a scope that read one when it changes", () => {
    const { store, post } = Push();
    post(["r"], { constructor: { v: 1 } });
    const scope = ObservableScope.Create(() => store.Get<any>("r").constructor?.v);
    expect(ObservableScope.Value(scope)).toBe(1);

    post(["r", "constructor", "v"], 2);
    expect(ObservableScope.Value(scope)).toBe(2);
    ObservableScope.Destroy(scope);
  });

  it("writes one through a proxy", () => {
    const proxy = ObservableNode.Create({ toString: { v: 1 } as any });
    proxy.toString = { v: 2 };
    expect(proxy.toString.v).toBe(2);
    expect(ObservableNode.Snapshot(proxy)).toEqual({ toString: { v: 2 } });
  });

  // Update and Read look up a key's scope; one nobody has read has no scope of its own.
  // Functions were removed from API
  /* it("updates and reads one nobody has read", () => {
    const raw = { toString: { v: 1 }, a: 1 };
    const proxy = ObservableNode.Create(raw);
    expect(proxy.a).toBe(1);
    expect(() => ObservableNode.Update(raw, "toString")).not.toThrow();
    expect(() => ObservableNode.Read(raw, "toString")).not.toThrow();
  }); */

  it("deletes one nobody has read", () => {
    const proxy = ObservableNode.Create({ toString: { v: 1 }, a: 1 } as any);
    expect(proxy.a).toBe(1);
    ObservableNode.Apply(proxy, { a: 2 });
    expect(proxy.a).toBe(2);
    expect(Object.hasOwn(proxy, "toString")).toBe(false);
  });
});

// Mutating a posted value afterwards is only a probe for whether the store copied it; a real
// channel delivers copies.
describe("pushed store on updates to an existing root (issue 3)", () => {
  it("clones an update", () => {
    const { store, post } = Push();
    post(["r"], { a: { x: 1 } });
    const value = { x: 2 };
    post(["r", "a"], value);
    value.x = 20;
    expect(store.Get<any>("r").a.x).toBe(2);
  });
});

// Spreading an array into a call (`list.push(...items)`, `splice(start, n, ...items)`) passes
// each element as an argument, which overflows the stack past a limit set by the engine and
// the thread's stack (smaller in a worker). Each case here is big enough to overflow in Node,
// and its diff or items must arrive whole.
describe("large diffs and item lists", () => {
  const N = 300_000;
  /** An object of n keys, each holding `value`: diffed against another value, n entries. */
  const Big = (n: number, value: number) => {
    const out: Record<string, number> = {};
    for (let i = 0; i < n; i++) out[`k${i}`] = value;
    return out;
  };
  const Items = (n: number) => Array.from({ length: n }, (_, i) => i);
  const routes = { "/": { projections: { big: { reads: ["n"], projection: (n: number) => Big(N, n) } } } };
  const ProjectionEntries = (diff: any[]) => diff.filter((e) => e.path[0] === "$projection_big");

  it("a projection whose result changes in many places (DiffTree.Commit)", () => {
    const tree = new DiffTree(undefined, routes);
    tree.WritePath("n", 1);
    tree.RunProjections();
    tree.Commit();
    tree.WritePath("n", 2);
    tree.RunProjections();
    expect(ProjectionEntries(tree.Commit())).toHaveLength(N);
  });

  it("the same, delivered by a DiffTreePublisher", () => {
    const posted: any[] = [];
    const publisher = new DiffTreePublisher(undefined, routes);
    publisher.Subscribe({}, (post) => posted.push(post));
    publisher.WritePath("n", 1);
    publisher.RunProjections();
    publisher.Commit();
    publisher.WritePath("n", 2);
    publisher.RunProjections();
    publisher.Commit();
    expect(posted).toHaveLength(2);
    expect(ProjectionEntries(posted[1].diff)).toHaveLength(N);
  });

  it("a projection that a splice changes in many places (DiffTree.SplicePath)", () => {
    const tree = new DiffTree(undefined, {
      "/": { projections: { big: { reads: ["list"], projection: (list: number[]) => Big(N, list.length) } } },
    });
    tree.WritePath("list", [1]);
    tree.RunProjections();
    tree.Commit();
    tree.SplicePath("list", 0, 0, [2]);
    tree.RunProjections();
    expect(ProjectionEntries(tree.Commit())).toHaveLength(N);
  });

  // A write inside a keyed entity is diffed at the entity's own root as well.
  it("a write inside a keyed entity that changes it in many places (DiffTree.WritePath with a keyFunc)", () => {
    const tree = new DiffTree((v: any) => v?._id);
    tree.WritePath("list", [{ _id: "a", data: Big(N, 1) }]);
    tree.WritePath("list.0.data", Big(N, 2));
    expect(tree.Snapshot("a").data.k0).toBe(2);
  });
});

// A projection result that embeds a snapshot it read (e.g. returning a read value as-is) was
// stored in the tree by reference. A later re-run's diff then wrote into that snapshot object
// in place, changing a snapshot already handed out. A projection's output is now replaced
// whole on each run and registered as its own snapshot, so it's never written into.
describe("projection results that embed a snapshot", () => {
  const KeyFunc = (v: any) => v?._id;
  const routes = { "/": { projections: { u: { reads: ["user_1"], projection: (u: any) => u } } } };

  function Setup() {
    const tree = new DiffTree(KeyFunc, routes);
    tree.WritePath("users", [{ _id: "user_1", name: "Ann", address: { city: "A" } }]);
    tree.RunProjections();
    tree.Commit();
    return tree;
  }

  it("doesn't change a snapshot handed out before the projection re-runs", () => {
    const tree = Setup();
    const before = tree.Snapshot("user_1");

    tree.WritePath("user_1.name", "Bob");
    tree.WritePath("user_1.address.city", "B");
    tree.RunProjections();

    expect(before).toEqual({ _id: "user_1", name: "Ann", address: { city: "A" } });
    expect(tree.Snapshot("user_1")).toEqual({ _id: "user_1", name: "Bob", address: { city: "B" } });
  });

  it("still diffs the projection's result when the entity changes", () => {
    const tree = Setup();

    tree.WritePath("user_1.name", "Bob");
    tree.RunProjections();
    expect(tree.Commit()).toContainEqual({ type: "write", path: ["$projection_u", "name"], value: "Bob" });
    expect(tree.ReadPath("$projection_u").name).toBe("Bob");
  });
});

// The general rule behind the case above: every value the tree applies is a copy it owns.
// WritePath/PushPath/SplicePath stored the caller's own objects, so a caller mutating its
// value afterwards changed the tree with no diff and no snapshot invalidation.
describe("the tree owns every value it applies", () => {
  it("WritePath: a caller mutating its value afterwards doesn't change the tree", () => {
    const tree = new DiffTree();
    const data = { a: { x: 1 } };
    tree.WritePath("doc", data);
    data.a.x = 99;

    expect(tree.ReadPath("doc.a.x")).toBe(1);
    expect(tree.ReadPath("doc")).not.toBe(data);
  });

  it("WritePath: only the changed part of an existing value is replaced", () => {
    const tree = new DiffTree();
    tree.WritePath("doc", { a: { x: 1 }, b: { y: 1 } });
    const unchanged = tree.ReadPath("doc.b");
    const data = { a: { x: 2 }, b: { y: 1 } };
    tree.WritePath("doc", data);
    data.a.x = 99;

    expect(tree.ReadPath("doc.a.x")).toBe(2);
    expect(tree.ReadPath("doc.b")).toBe(unchanged);
  });

  it("PushPath: a caller mutating a pushed item afterwards doesn't change the tree", () => {
    const tree = new DiffTree();
    tree.WritePath("list", []);
    const item = { x: 1 };
    tree.PushPath("list", [item]);
    item.x = 99;

    expect(tree.ReadPath("list.0.x")).toBe(1);
  });

  it("SplicePath: a caller mutating an inserted item afterwards doesn't change the tree", () => {
    const tree = new DiffTree();
    tree.WritePath("list", [{ x: 0 }]);
    const item = { x: 1 };
    tree.SplicePath("list", 1, 0, [item]);
    item.x = 99;

    expect(tree.ReadPath("list.1.x")).toBe(1);
  });

  it("keyed entities: a slot holds the entity's home, not the caller's object", () => {
    const tree: any = new DiffTree((v: any) => v?._id);
    tree.WritePath("list", []);
    const item = { _id: "a", x: 1 };
    tree.PushPath("list", [item]);
    item.x = 99;

    expect(tree.rootState.list[0]).toBe(tree.rootState.a);
    expect(tree.ReadPath("a.x")).toBe(1);
  });
});

// A diff entry doesn't own its value: it references the caller's objects, and entries for a
// keyed entity and its embedded copy share one. Whatever applies a diff clones each value, so
// neither the tree nor a store shares an object with the diff, the caller, or another entry.
describe("diff entries don't own their values", () => {
  const KeyFunc = (v: any) => v?._id;

  it("Commit: the tree's slot holds the keyed entity's home, apart from the caller's object", () => {
    const tree: any = new DiffTree(KeyFunc);
    const item = { _id: "a", value: "a" };
    tree.WritePath("arr", [item]);
    const diff = tree.Commit();

    const list = diff.find((d: any) => d.path.join(".") === "arr")!.value as any[];
    const root = diff.find((d: any) => d.path.join(".") === "a")!.value;
    expect(root).toBe(list[0]);
    expect(tree.rootState.a).not.toBe(item);
    expect(tree.rootState.arr[0]).toBe(tree.rootState.a);
  });

  it("PushPath: the tree doesn't share the caller's items", () => {
    const tree: any = new DiffTree(KeyFunc);
    tree.WritePath("arr", []);
    const item = { _id: "a", value: "a" };
    tree.PushPath("arr", [item]);

    expect(tree.rootState.arr[0]).not.toBe(item);
    expect(tree.rootState.a).not.toBe(item);
    expect(tree.rootState.arr[0]).toBe(tree.rootState.a);
  });

  it("SplicePath: the tree doesn't share the caller's items", () => {
    const tree: any = new DiffTree(KeyFunc);
    tree.WritePath("arr", []);
    const item = { _id: "a", value: "a" };
    tree.SplicePath("arr", 0, 0, [item]);

    expect(tree.rootState.arr[0]).not.toBe(item);
    expect(tree.rootState.a).not.toBe(item);
    expect(tree.rootState.arr[0]).toBe(tree.rootState.a);
  });

  it("the committed diff doesn't share objects with the tree", () => {
    const tree: any = new DiffTree();
    tree.WritePath("doc", { a: { x: 1 } });
    const diff = tree.Commit();

    expect(diff[0].value).not.toBe(tree.rootState.doc);
  });

  it("a pushed store applying one object from two entries keeps separate copies", () => {
    const target = new EventTarget();
    const store = new DiffStore(target);
    const shared = { x: 1 };
    target.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: DIFF_TREE_EVENT,
          data: [{ type: "write", path: ["r"], value: { a: {}, b: {} } }],
        },
      }),
    );
    target.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: DIFF_TREE_EVENT,
          data: [{ type: "write", path: ["r", "a"], value: shared }, { type: "write", path: ["r", "b"], value: shared }],
        },
      }),
    );
    shared.x = 99;

    const r = ObservableNode.Unwrap(store.Get<any>("r"));
    expect(r.a).toEqual({ x: 1 });
    expect(r.a).not.toBe(r.b);
  });
});
