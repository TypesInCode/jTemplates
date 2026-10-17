import { describe, it, expect } from "vitest";
import { DiffSync } from "../../src/Store/Diff/diffSync";
import { DiffTree } from "../../src/Store/Diff/diffTree";
import { PROJECTION_PREFIX } from "../../src/Store/Diff";
import { JsonType } from "../../src/Utils/json";

function KeyFunc(val: any) {
  const type = JsonType(val);
  switch (type) {
    case "object":
      return val._id;
    default:
      return undefined;
  }
}

// DiffSync has no read API of its own; reach the wrapped tree to check applied state.
function Tree(sync: DiffSync): DiffTree {
  return (sync as any).diffTree;
}

// DiffSync wraps a DiffTree and, after each operation, runs the tree's projections once and
// appends their diff to the operation's result.
describe("Diff Sync Test", () => {
  it("DiffPath returns the diff and applies it", () => {
    const sync = new DiffSync(KeyFunc);

    const result = sync.DiffPath("root", { _id: "test", value: "test" });

    expect(result.length).toBe(2);
    expect(Tree(sync).GetPath("root")).toEqual({ _id: "test", value: "test" });
    expect(Tree(sync).GetPath("test")).toEqual({ _id: "test", value: "test" });
  });

  it("DiffPath returns no diff when the value is unchanged", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("root", { value: "test" });

    expect(sync.DiffPath("root", { value: "test" })).toEqual([]);
  });

  it("PatchPath merges the patch into the current value", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("root", { a: 1, b: { c: 2, d: 3 } });

    const result = sync.PatchPath("root", { b: { c: 5 } });

    expect(result).toEqual([{ path: ["root", "b", "c"], value: 5 }]);
    expect(Tree(sync).GetPath("root")).toEqual({ a: 1, b: { c: 5, d: 3 } });
  });

  it("PatchPath updates a keyed entity's root", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("list", [{ _id: "e1", value: "one" }]);

    sync.PatchPath("e1", { value: "two" });

    expect(Tree(sync).GetPath("list.0")).toEqual({ _id: "e1", value: "two" });
  });

  it("PushPath appends items to an array", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("arr", [1]);

    const result = sync.PushPath("arr", [2, 3]);

    expect(result).toEqual([
      { path: ["arr", "1"], value: 2 },
      { path: ["arr", "2"], value: 3 },
      { path: ["arr", "length"], value: 3 },
    ]);
    expect(Tree(sync).GetPath("arr")).toEqual([1, 2, 3]);
  });

  it("PushPath registers pushed keyed entities", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("arr", []);

    sync.PushPath("arr", [{ _id: "a", value: "a" }]);

    expect(Tree(sync).GetPath("a")).toEqual({ _id: "a", value: "a" });
  });

  it("SplicePath removes and inserts items and returns the removed ones", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("arr", [
      { _id: "a", value: "a" },
      { _id: "b", value: "b" },
      { _id: "c", value: "c" },
    ]);

    const result = sync.SplicePath("arr", 1, 1, [{ _id: "x", value: "x" }]);

    expect(result.path).toEqual(["arr"]);
    expect(result.start).toBe(1);
    expect(result.deleteCount).toBe(1);
    expect(result.spliceResult).toEqual([{ _id: "b", value: "b" }]);
    expect(result.diffResult).toContainEqual({ path: ["x"], value: { _id: "x", value: "x" } });
    expect(Tree(sync).Snapshot("arr")).toEqual([
      { _id: "a", value: "a" },
      { _id: "x", value: "x" },
      { _id: "c", value: "c" },
    ]);
  });

  it("SplicePath with no deleteCount removes to the end", () => {
    const sync = new DiffSync(KeyFunc);
    sync.DiffPath("arr", [1, 2, 3, 4]);

    const result = sync.SplicePath("arr", 1, undefined, []);

    expect(result.deleteCount).toBe(3);
    expect(result.spliceResult).toEqual([2, 3, 4]);
    expect(Tree(sync).GetPath("arr")).toEqual([1]);
  });
});

describe("Diff Sync Projection Test", () => {
  const key = `${PROJECTION_PREFIX}total`;

  function CountingSync() {
    const calls = { total: 0 };
    const sync = new DiffSync(KeyFunc, {
      total: {
        reads: ["items"],
        projection: (_keys: string[], items: any[]) => {
          calls.total++;
          return items.length;
        },
      },
    });
    return { sync, calls };
  }

  function ProjectionDiffs(result: { path: (string | number)[] }[]) {
    return result.filter((d) => d.path[0] === key);
  }

  it("DiffPath runs projections once and includes their diff", () => {
    const { sync, calls } = CountingSync();

    const result = sync.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);

    expect(calls.total).toBe(1);
    expect(ProjectionDiffs(result)).toEqual([{ path: [key], value: 2 }]);
    expect(Tree(sync).GetPath(key)).toBe(2);
  });

  it("PatchPath runs projections once and includes their diff", () => {
    const { sync, calls } = CountingSync();
    sync.DiffPath("items", [{ _id: "a" }]);

    const result = sync.PatchPath("items", [{ _id: "a" }, { _id: "b" }]);

    expect(calls.total).toBe(2);
    expect(ProjectionDiffs(result)).toEqual([{ path: [key], value: 2 }]);
  });

  it("PushPath runs projections once and includes their diff", () => {
    const { sync, calls } = CountingSync();
    sync.DiffPath("items", [{ _id: "a" }]);

    const result = sync.PushPath("items", [{ _id: "b" }, { _id: "c" }]);

    expect(calls.total).toBe(2);
    expect(ProjectionDiffs(result)).toEqual([{ path: [key], value: 3 }]);
  });

  it("SplicePath runs projections once and includes their diff", () => {
    const { sync, calls } = CountingSync();
    sync.DiffPath("items", [{ _id: "a" }, { _id: "b" }]);

    const result = sync.SplicePath("items", 0, 1, []);

    expect(calls.total).toBe(2);
    expect(ProjectionDiffs(result.diffResult)).toEqual([{ path: [key], value: 1 }]);
  });

  it("doesn't run projections when nothing they read changed", () => {
    const { sync, calls } = CountingSync();
    sync.DiffPath("items", [{ _id: "a" }]);

    const result = sync.DiffPath("other", "x");

    expect(calls.total).toBe(1);
    expect(ProjectionDiffs(result)).toEqual([]);
  });

  it("runs a projection on the write that first satisfies its reads", () => {
    const { sync, calls } = CountingSync();

    sync.DiffPath("other", "x");
    expect(calls.total).toBe(0);

    sync.PatchPath("other", "y");
    expect(calls.total).toBe(0);

    const result = sync.DiffPath("items", []);
    expect(calls.total).toBe(1);
    expect(ProjectionDiffs(result)).toEqual([{ path: [key], value: 0 }]);
  });

  it("runs chained projections in order within one operation", () => {
    const sync = new DiffSync(KeyFunc, {
      doubled: {
        reads: [`${PROJECTION_PREFIX}count`],
        projection: (_keys: string[], count: number) => count * 2,
      },
      count: {
        reads: ["items"],
        projection: (_keys: string[], items: any[]) => items.length,
      },
    });

    sync.DiffPath("items", [1]);
    const result = sync.PushPath("items", [2, 3]);

    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}count`], value: 3 });
    expect(result).toContainEqual({ path: [`${PROJECTION_PREFIX}doubled`], value: 6 });
  });
});
