import { describe, it, expect } from "vitest";
import { PushStore } from "../../src/Store/Store/pushStore";
import { DIFF_TREE_EVENT } from "../../src/Store/Diff";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { DiffSync } from "../../src/Store/Diff/diffSync";
import { DiffTreeWriter } from "../../src/Store/Diff/diffTreeWriter";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

// The cases in docs/bugs/observable-node-proxy-own-keys.md. Each asserts the fixed behaviour.

/** A PushStore and a function that posts one change to it, synchronously. */
function Push(cloneData?: boolean) {
  const target = new EventTarget();
  const store = new PushStore(target, undefined, cloneData);
  const post = (path: string[], value: unknown) =>
    target.dispatchEvent(
      new MessageEvent("message", {
        data: { type: DIFF_TREE_EVENT, data: [{ type: "diff", result: [{ path, value }] }] },
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

  it("is false for a key a PushStore's root doesn't have", () => {
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
    ObservableNode.ApplyDiff(list, [{ path: ["2"], value: 3 }]);
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

  it("reads them through a PushStore, as JSON shows them", () => {
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
  it("updates and reads one nobody has read", () => {
    const raw = { toString: { v: 1 }, a: 1 };
    const proxy = ObservableNode.Create(raw);
    expect(proxy.a).toBe(1);
    expect(() => ObservableNode.Update(raw, "toString")).not.toThrow();
    expect(() => ObservableNode.Read(raw, "toString")).not.toThrow();
  });

  it("replaces a whole root that held one nobody has read", () => {
    const proxy = ObservableNode.Create({ toString: { v: 1 }, a: 1 } as any);
    expect(proxy.a).toBe(1);
    ObservableNode.ApplyDiff(proxy, [{ path: [], value: { a: 2 } }]);
    expect(proxy.a).toBe(2);
    expect(Object.hasOwn(proxy, "toString")).toBe(false);
  });
});

// Mutating a posted value afterwards is only a probe for whether the store copied it; a real
// channel delivers copies.
describe("PushStore cloneData on updates to an existing root (issue 3)", () => {
  it("adopts the value of a new root without cloning", () => {
    const { store, post } = Push();
    const first = { a: { x: 1 } };
    post(["r"], first);
    first.a.x = 10;
    expect(store.Get<any>("r").a.x).toBe(10);
  });

  it("adopts the value of an update without cloning", () => {
    const { store, post } = Push();
    post(["r"], { a: { x: 1 } });
    const value = { x: 2 };
    post(["r", "a"], value);
    value.x = 20;
    expect(store.Get<any>("r").a.x).toBe(20);
  });

  it("clones an update when constructed with cloneData", () => {
    const { store, post } = Push(true);
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
  const projections = { big: { reads: ["n"], projection: (_keys: string[], n: number) => Big(N, n) } };

  it("a projection whose result changes in many places (DiffTree.RunProjections)", () => {
    const tree = new DiffTree(undefined, projections);
    tree.DiffPath("n", 1);
    tree.RunProjections();
    tree.DiffPath("n", 2);
    expect(tree.RunProjections()).toHaveLength(N);
  });

  it("the same, committed by a DiffTreeWriter", () => {
    const posted: any[] = [];
    const writer = new DiffTreeWriter({ postMessage: (m) => posted.push(m) }, undefined, projections);
    writer.DiffPath("n", 1);
    writer.Commit();
    writer.DiffPath("n", 2);
    writer.Commit();
    expect(posted).toHaveLength(2);
    const entries = posted[1].data.flatMap((d: any) => d.result);
    expect(entries.filter((e: any) => e.path[0] === "$projection_big")).toHaveLength(N);
  });

  it("a projection that a splice changes in many places (DiffSync.SplicePath)", () => {
    const sync = new DiffSync(undefined, {
      big: { reads: ["list"], projection: (_keys: string[], list: number[]) => Big(N, list.length) },
    });
    sync.DiffPath("list", [1]);
    const result = sync.SplicePath("list", 0, 0, [2]);
    expect(result.diffResult.filter((e) => e.path[0] === "$projection_big")).toHaveLength(N);
  });

  // A write inside a keyed entity is diffed at the entity's own root as well.
  it("a write inside a keyed entity that changes it in many places (DiffTree.DiffPath with a keyFunc)", () => {
    const tree = new DiffTree((v: any) => v?._id);
    tree.DiffPath("list", [{ _id: "a", data: Big(N, 1) }]);
    tree.DiffPath("list.0.data", Big(N, 2));
    expect(tree.Snapshot("a").data.k0).toBe(2);
  });

  it("many items pushed (DiffTree.PushPath)", () => {
    const tree = new DiffTree();
    tree.DiffPath("list", []);
    tree.PushPath("list", Items(N));
    expect(tree.Snapshot("list")).toHaveLength(N);
  });

  it("many items spliced in (DiffTree.SplicePath)", () => {
    const tree = new DiffTree();
    tree.DiffPath("list", [-1]);
    tree.SplicePath("list", 1, 0, Items(N));
    expect(tree.Snapshot("list")).toHaveLength(N + 1);
  });

  it("many items spliced into an observable array (ObservableNode.ApplySplice)", () => {
    const list = ObservableNode.Create({ list: [-1] }).list;
    ObservableNode.ApplySplice(list, 1, 0, Items(N), false);
    expect(list.length).toBe(N + 1);
  });

  // An exception in the store's listener is reported, not thrown to dispatchEvent: an overflow
  // shows as the items missing.
  it("many items spliced into a PushStore's array", () => {
    const target = new EventTarget();
    const store = new PushStore(target);
    const post = (data: unknown) => target.dispatchEvent(new MessageEvent("message", { data }));
    post({ type: DIFF_TREE_EVENT, data: [{ type: "diff", result: [{ path: ["list"], value: [-1] }] }] });
    post({
      type: DIFF_TREE_EVENT,
      data: [
        {
          type: "splice",
          result: { path: ["list"], start: 1, deleteCount: 0, items: Items(N), diffResult: [] },
        },
      ],
    });
    expect(store.Get<number[]>("list").length).toBe(N + 1);
  });
});
