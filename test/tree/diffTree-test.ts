import { describe, it, expect } from "vitest";
import { DiffTreeFactory, PROJECTION_PREFIX } from "../../src/Store/Diff/diffTree";
import { JsonDiffFactory } from "../../src/Utils/json";
import { JsonType } from "../../src/Utils/json";
import { ArraysEqual } from "../../src/Utils/array";

const DiffTreeConstructor = DiffTreeFactory(JsonDiffFactory, ArraysEqual);

function KeyFunc(val: any) {
  const type = JsonType(val);
  switch (type) {
    case "object":
      return val._id;
    default:
      return undefined;
  }
}

describe("Diff Tree Test", () => {
  it("Default Test", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("root", { value: "test" });
    expect(result.length).to.eq(1);
  });
  it("Default Flatten", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("root", { _id: "test", value: "test" });
    expect(result.length).to.eq(2);
  });
  it("Default Flatten 02", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("root", {
      data: { _id: "test", value: "test" },
    });
    expect(result.length).to.eq(2);
  });
  it("Flatten With Update", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("data", { _id: "test", value: "value" });
    expect(result.length).to.eq(2);
  });
  it("Flatten With No Update", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("root.data", { _id: "test", value: "test" });
    expect(result.length).to.eq(0);
  });
  it("Update single value", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("root.data.value", "value");
    expect(result.length).to.eq(2);
  });
  it("Duplicate object - Update single value", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", {
      data: { _id: "test", value: "test" },
      data2: { _id: "test", value: "test" },
    });

    const result = tree.DiffPath("root.data.value", "value");
    expect(result.length).to.eq(2);

    const result2 = tree.DiffPath("root.data2", {
      _id: "uniqueId",
      value: "new value",
      test: "test",
    });
    expect(result2.length).to.eq(4);

    const result3 = tree.DiffPath("root.data2.value", "updated value");
    expect(result3.length).to.eq(2);
  });
});

// DiffTree.Snapshot is internal (not on IDiffTree) and only used through `tree as any`; it
// backs a future feature. It mirrors ObservableNode.Snapshot: an immutable copy of a raw
// tree value, cached per value and invalidated along the path from a write to its roots. A
// keyed child's snapshot comes from its root entity (`source[key]`, resolved via keyFunc),
// the parallel of ObservableNode's `alias`.
describe("Diff Tree Snapshot Test", () => {
  it("copies nested objects, arrays and keyed entities", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("doc", {
      title: "t",
      tags: ["a", "b"],
      items: [{ _id: "a", value: "a" }, { _id: "b", value: "b" }],
    });

    expect(tree.Snapshot("doc")).toEqual({
      title: "t",
      tags: ["a", "b"],
      items: [{ _id: "a", value: "a" }, { _id: "b", value: "b" }],
    });
  });

  it("returns primitive values unchanged", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", { value: "test" });

    expect(tree.Snapshot("root.value")).toBe("test");
  });

  it("reads keyed entities through their root", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("arr", [{ _id: "a", value: "a" }, { _id: "b", value: "b" }]);
    tree.DiffPath("a", { _id: "a", value: "changed" });

    expect(tree.Snapshot("arr")).toEqual([
      { _id: "a", value: "changed" },
      { _id: "b", value: "b" },
    ]);
  });

  it("returns the same object from repeated reads with no write between", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("doc", { items: [{ _id: "a", value: "a" }], meta: { n: 1 } });

    const first = tree.Snapshot("doc");
    const second = tree.Snapshot("doc");

    expect(second).toBe(first);
    expect(second.items).toBe(first.items);
    expect(second.meta).toBe(first.meta);
  });

  it("makes new containers only along the path to a change", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("arr", [
      { _id: "a", value: "a" },
      { _id: "b", value: "b" },
      { _id: "c", value: "c" },
    ]);
    const before = tree.Snapshot("arr");

    tree.DiffPath("b", { _id: "b", value: "changed" });
    const after = tree.Snapshot("arr");

    expect(after).not.toBe(before);
    expect(after[1]).not.toBe(before[1]);
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
  });

  it("keeps a root's snapshot when a different root is written", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("one", [{ _id: "a", value: "a" }]);
    tree.DiffPath("two", [{ _id: "c", value: "c" }]);
    const one = tree.Snapshot("one");

    tree.DiffPath("c", { _id: "c", value: "changed" });

    expect(tree.Snapshot("one")).toBe(one);
  });

  it("shows a change to an unkeyed object nested in a root", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("root", { outer: { inner: { value: "one" } } });
    tree.Snapshot("root");

    tree.DiffPath("root", { outer: { inner: { value: "changed" } } });

    expect(tree.Snapshot("root").outer.inner.value).toBe("changed");
  });

  it("shows a Splice", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("arr", [
      { _id: "a", value: "a" },
      { _id: "b", value: "b" },
      { _id: "c", value: "c" },
    ]);
    tree.Snapshot("arr");

    tree.SplicePath("arr", 1, 1, [{ _id: "x", value: "x" }]);

    expect(tree.Snapshot("arr")).toEqual([
      { _id: "a", value: "a" },
      { _id: "x", value: "x" },
      { _id: "c", value: "c" },
    ]);
  });
});

// Projections: pure functions declared with the tree paths they read (`reads`), computed
// from those values positionally, stored at `$projection_<id>` and diffed like any other
// write. A projection is only re-run when one of its declared `reads` has a different
// snapshot than last time (built on Snapshot's cache/invalidation), and may chain by
// declaring a read of another projection's `$projection_<id>` output. `reads` is static, so
// evaluation order and cycle detection are resolved once, at construction.
describe("Diff Tree Projection Test", () => {
  it("computes a projection and includes its result in the diff", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (items: any[]) => items.length,
      },
    });

    const result = tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);

    const key = `${PROJECTION_PREFIX}total`;
    expect(result).toContainEqual({ path: [key], value: 2 });
    expect(tree.GetPath(key)).toBe(2);
  });

  it("does not run while a declared dependency doesn't exist yet", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls++;
          return items.length;
        },
      },
    });

    // Nothing has written "items" yet; the projection must not run or produce a diff, so
    // its author never has to guard against an undefined `items`.
    const result = tree.DiffPath("other", "x");
    expect(calls).toBe(0);
    expect(result.find((d: any) => d.path[0] === `${PROJECTION_PREFIX}total`)).toBeUndefined();
    expect(tree.GetPath(`${PROJECTION_PREFIX}total`)).toBeUndefined();

    // Once "items" exists, the projection runs on that same write.
    const second = tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);
    expect(calls).toBe(1);
    expect(second).toContainEqual({ path: [`${PROJECTION_PREFIX}total`], value: 2 });
  });

  it("blocks a chained projection until its upstream dependency exists", () => {
    const calls = { count: 0, doubled: 0 };
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      count: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls.count++;
          return items.length;
        },
      },
      doubled: {
        reads: [`${PROJECTION_PREFIX}count`],
        projection: (count: number) => {
          calls.doubled++;
          return count * 2;
        },
      },
    });

    // "count" is blocked (no "items" yet), so it never writes $projection_count, so
    // "doubled" is blocked in turn without any special-casing for chained dependencies.
    tree.DiffPath("other", "x");
    expect(calls).toEqual({ count: 0, doubled: 0 });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(calls).toEqual({ count: 1, doubled: 1 });
    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBe(2);
  });

  it("does not re-run when data it didn't read changes", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls++;
          return items.length;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(calls).toBe(1);

    const result = tree.DiffPath("other", { value: "unrelated" });

    expect(calls).toBe(1);
    expect(result.find((d: any) => d.path[0] === `${PROJECTION_PREFIX}total`)).toBeUndefined();
  });

  it("re-runs and diffs when data it read changes", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls++;
          return items.length;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(calls).toBe(1);

    const result = tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);

    expect(calls).toBe(2);
    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}total`], value: 2 });
  });

  it("re-runs but emits no diff when the recomputed result is unchanged", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      hasItems: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls++;
          return items.length > 0;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(calls).toBe(1);

    // Different array, but it doesn't change what the projection returns.
    const result = tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);

    expect(calls).toBe(2);
    expect(result.find((d: any) => d.path[0] === `${PROJECTION_PREFIX}hasItems`)).toBeUndefined();
  });

  it("re-runs only after a write to an entity it read by key", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      name: {
        reads: ["a"],
        projection: (a: any) => {
          calls++;
          return a?.value;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a", value: "one" }]);
    expect(calls).toBe(1);
    expect(tree.GetPath(`${PROJECTION_PREFIX}name`)).toBe("one");

    tree.DiffPath("other", "noop");
    expect(calls).toBe(1);

    tree.DiffPath("a", { _id: "a", value: "changed" });
    expect(calls).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}name`)).toBe("changed");
  });

  it("chains: a downstream projection reads an upstream projection's output", () => {
    const calls = { count: 0, doubled: 0 };
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      count: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls.count++;
          return items.length;
        },
      },
      doubled: {
        reads: [`${PROJECTION_PREFIX}count`],
        projection: (count: number) => {
          calls.doubled++;
          return count * 2;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}count`)).toBe(1);
    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBe(2);
    expect(calls).toEqual({ count: 1, doubled: 1 });

    // Unrelated write: neither projection reads it, so neither re-runs.
    tree.DiffPath("other", "noop");
    expect(calls).toEqual({ count: 1, doubled: 1 });

    // Changes the upstream projection's dependency, so both re-run in order.
    tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);
    expect(tree.GetPath(`${PROJECTION_PREFIX}count`)).toBe(2);
    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBe(4);
    expect(calls).toEqual({ count: 2, doubled: 2 });
  });

  it("chains correctly regardless of declaration order", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      // "doubled" is declared before "count", the projection it depends on.
      doubled: {
        reads: [`${PROJECTION_PREFIX}count`],
        projection: (count: number) => count * 2,
      },
      count: {
        reads: ["items"],
        projection: (items: any[]) => items.length,
      },
    });

    tree.DiffPath("items", [{ _id: "a" }, { _id: "b" }, { _id: "c" }]);

    expect(tree.GetPath(`${PROJECTION_PREFIX}doubled`)).toBe(6);
  });

  it("rejects a direct cycle between two projections at construction", () => {
    expect(
      () =>
        new DiffTreeConstructor(KeyFunc, {
          a: { reads: [`${PROJECTION_PREFIX}b`], projection: (b: any) => b },
          b: { reads: [`${PROJECTION_PREFIX}a`], projection: (a: any) => a },
        }),
    ).toThrow(/cycle/i);
  });

  it("rejects a projection that reads its own output at construction", () => {
    expect(
      () =>
        new DiffTreeConstructor(KeyFunc, {
          self: { reads: [`${PROJECTION_PREFIX}self`], projection: (self: any) => self },
        }),
    ).toThrow(/cycle/i);
  });

  it("rejects a projection reading an id that isn't registered, at construction", () => {
    expect(
      () =>
        new DiffTreeConstructor(KeyFunc, {
          a: { reads: [`${PROJECTION_PREFIX}missing`], projection: (v: any) => v },
        }),
    ).toThrow(/missing/);
  });

  it("flattens a keyed entity embedded in a projection's result to its own root", () => {
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      summary: {
        reads: ["count"],
        projection: (count: number) => ({ best: { _id: "derived", value: count } }),
      },
    });

    tree.DiffPath("count", 5);

    // "derived" exists only inside the projection's result; flatten registers it as its
    // own root the same way it would for any other write, via UpdateSource.
    expect(tree.GetPath("derived")).toEqual({ _id: "derived", value: 5 });
  });

  it("runs once per SplicePath call and includes the projection diff", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (items: any[]) => {
          calls++;
          return items.length;
        },
      },
    });

    tree.DiffPath("items", [{ _id: "a" }]);
    expect(calls).toBe(1);

    const spliceResult = tree.SplicePath("items", 1, 0, [{ _id: "b" }]);

    expect(calls).toBe(2);
    expect(spliceResult.diffResult).toContainEqual({ path: [`${PROJECTION_PREFIX}total`], value: 2 });
  });

  it("runs once per DiffBatch call, not once per item", () => {
    let calls = 0;
    const tree: any = new DiffTreeConstructor(KeyFunc, {
      combined: {
        reads: ["a", "b"],
        projection: (a: any, b: any) => {
          calls++;
          return `${a?.value}-${b?.value}`;
        },
      },
    });

    const result = tree.DiffBatch([
      { path: "a", value: { value: "x" } },
      { path: "b", value: { value: "y" } },
    ]);

    expect(calls).toBe(1);
    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}combined`], value: "x-y" });
  });
});
