import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { KeyFunc, snapshotCases } from "./snapshot-cases";

snapshotCases("StoreSync", () => new StoreSync(KeyFunc));

// Nodes made with ObservableNode.Create: no store, no keyed entities, writable proxies.
describe("ObservableNode snapshots without a store", () => {
  it("returns the same object from repeated reads with no write between", () => {
    const node = ObservableNode.Create({ a: { b: 1 }, list: [1, 2] });

    expect(ObservableNode.Snapshot(node)).toBe(ObservableNode.Snapshot(node));
  });

  it("shows a write to a top-level field and to a nested field through the proxy", () => {
    const node = ObservableNode.Create<any>({ a: { b: 1 }, c: 1 });
    const before = ObservableNode.Snapshot(node);

    node.c = 2;
    expect(ObservableNode.Snapshot(node)).toEqual({ a: { b: 1 }, c: 2 });

    node.a.b = 2;
    expect(ObservableNode.Snapshot(node)).toEqual({ a: { b: 2 }, c: 2 });
    expect(before).toEqual({ a: { b: 1 }, c: 1 });
  });

  it("shows an array changed through its proxy's methods", () => {
    const node = ObservableNode.Create<number[]>([3, 1, 2]);
    ObservableNode.Snapshot(node);

    node.push(4);
    expect(ObservableNode.Snapshot(node)).toEqual([3, 1, 2, 4]);

    node.sort();
    expect(ObservableNode.Snapshot(node)).toEqual([1, 2, 3, 4]);
  });

  it("shows an Apply that replaces every top-level field of a node", () => {
    const node = ObservableNode.Create<Record<string, unknown>>({ test: "value" });
    ObservableNode.Snapshot(node);

    // Every top-level field changes, so the diff replaces the root in one step.
    ObservableNode.Apply(node, { a: 1 });

    expect(ObservableNode.Snapshot(node)).toEqual({ a: 1 });
  });

  it("shows an Apply that changes some fields", () => {
    const node = ObservableNode.Create<Record<string, unknown>>({ a: 1, b: { c: 1 } });
    ObservableNode.Snapshot(node);

    ObservableNode.Apply(node, { a: 1, b: { c: 2 } });

    expect(ObservableNode.Snapshot(node)).toEqual({ a: 1, b: { c: 2 } });
  });
});
