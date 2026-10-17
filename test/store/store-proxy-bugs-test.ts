import { describe, it, expect } from "vitest";
import { PushStore } from "../../src/Store/Store/pushStore";
import { DIFF_TREE_EVENT } from "../../src/Store/Diff";
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
  function Reader<T>(read: (list: number[]) => T) {
    const list: number[] = ObservableNode.Create({ list: [1, 2] }).list;
    const scope = ObservableScope.Create(() => read(list));
    return { list, scope };
  }

  it.each([
    ["an element read (control)", (list: number[]) => list[2]],
    ["length", (list: number[]) => list.length],
    ["`in`", (list: number[]) => 2 in list],
    ["Object.keys", (list: number[]) => Object.keys(list).length],
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
