import { describe, it, expect } from "vitest";
import { JsonApplyDiff, JsonDiff, JsonDiffInto, JsonDiffOrder, JsonDiffResult, JsonHasChanges, JsonMove, JsonWrite } from "../../src/Utils/json";

// Computing a diff doesn't take ownership of its inputs: a record references the new value.
describe("JsonDiff record ownership", () => {
  it("references the new value rather than copying it", () => {
    const value = { a: { x: 1 } };
    const [record] = JsonDiff(value, undefined);

    expect(record.type).toBe("write");
    expect((record as JsonWrite).value).toBe(value);
  });

  it("references a nested part of the new value", () => {
    const child = { x: 2 };
    const diff = JsonDiff({ a: child, b: 1 } as any, { a: 1, b: 1 } as any);

    expect(diff).toEqual([{ type: "write", path: ["a"], value: { x: 2 } }]);
    expect(diff[0].type).toBe("write");
    expect((diff[0] as JsonWrite).value).toBe(child);
  });

  it("keeps an undefined value undefined", () => {
    const diff = JsonDiff({ a: 1, b: undefined } as any, { a: 1, b: 2 } as any);

    expect(diff).toEqual([{ type: "write", path: ["b"], value: undefined }]);
  });
});

// A diff doesn't own its values, so applying one clones each value it writes.
describe("JsonApplyDiff cloning", () => {

  it("doesn't share a record's value with the root", () => {
    const child = { x: 2 };
    const root: any = { a: 1 };
    JsonApplyDiff(root, [{ type: "write", path: ["a"], value: child }]);

    expect(root.a).toEqual(child);
    expect(root.a).not.toBe(child);
  });

  it("doesn't share one object between two records it applies", () => {
    const shared = { x: 1 };
    const root: any = {};
    JsonApplyDiff(root, [{ type: "write", path: ["a"], value: shared }, { type: "write", path: ["b"], value: shared }]);

    expect(root.a).not.toBe(root.b);
    expect(root.a).not.toBe(shared);
  });

  it("doesn't share a root replacement's contents with the record", () => {
    const child = { x: 1 };
    const root: any = { a: 0 };
    JsonApplyDiff(root, [{ type: "write", path: [], value: { a: child } }]);

    expect(root.a).toEqual(child);
    expect(root.a).not.toBe(child);
  });
});

// A record's parents can be missing from the root, e.g. a stale copy of the value it was diffed against
describe("JsonApplyDiff unresolved paths", () => {
  it("writes to sibling paths under different parents", () => {
    const root: any = { a: { x: 1 }, b: { y: 1 } };
    JsonApplyDiff(root, [{ type: "write", path: ["a", "x"], value: 2 }, { type: "write", path: ["b", "y"], value: 2 }]);

    expect(root).toEqual({ a: { x: 2 }, b: { y: 2 } });
  });
});

describe("JsonApplyDiff moving", () => {
  it("simple move in array", () => {
    const source: any = { data: [{ x: 1 }, { x: 2 }] };
    const destination: any = { data: [] };

    const diff1 = JsonDiff(source, destination);
    JsonApplyDiff(destination, diff1);
    expect(source).toEqual(destination);

    const source2 = { data: [{ x: 3 }, ...source.data] };
    // source.data.splice(0, 0, { x: 3 });
    const diff2 = JsonDiff(source2, source);
    expect(diff2.some(diff => diff.type === "move"));

    const test = destination.data[0];
    JsonApplyDiff(destination, diff2);
    const test2 = destination.data[1];
    expect(source2).toEqual(destination);
    expect(test).toEqual(test2);
  });

  it("swap values in array", () => {
    const source: any = { data: [{ x: 1 }, { x: 2 }] };
    const destination: any = { data: [] };

    const diff1 = JsonDiff(source, destination);
    JsonApplyDiff(destination, diff1);
    expect(source).toEqual(destination);

    const source2 = { data: [source.data[1], source.data[0]] };
    const diff2 = JsonDiff(source2, source);
    expect(diff2.some(diff => diff.type === "move"));

    const test = destination.data[0];
    JsonApplyDiff(destination, diff2);
    const test2 = destination.data[1];
    expect(source2).toEqual(destination);
    expect(test).toEqual(test2);
  });

  it("splice values in array", () => {
    const source: any = { data: [{ x: 1 }, { x: 2 }] };
    const destination: any = { data: [] };

    const diff1 = JsonDiff(source, destination);
    JsonApplyDiff(destination, diff1);
    expect(source).toEqual(destination);

    const source2 = { data: [source.data[0], { x: 3 }, source.data[1]] };
    const diff2 = JsonDiff(source2, source);
    expect(diff2.some(diff => diff.type === "move"));

    JsonApplyDiff(destination, diff2);
    expect(source2).toEqual(destination);
  });

  it("swap and add value in array", () => {
    const source: any = { data: [{ x: 1 }, { x: 2 }] };
    const destination: any = { data: [] };

    const diff1 = JsonDiff(source, destination);
    JsonApplyDiff(destination, diff1);
    expect(source).toEqual(destination);

    const source2 = { data: [source.data[1], { x: 3 }, source.data[0]] };
    const diff2 = JsonDiff(source2, source);
    expect(diff2.some(diff => diff.type === "move"));
    JsonApplyDiff(destination, diff2);
    expect(source2).toEqual(destination);
  });
});

describe("JsonHasChanges", () => {
  it("finds no change between equal values, shared or not", () => {
    const shared = { x: [1, 2, { y: "a" }] };
    expect(JsonHasChanges(shared, shared)).toBe(false);
    expect(JsonHasChanges({ a: 1, b: [1, { c: null }] }, { b: [1, { c: null }], a: 1 })).toBe(false);
    expect(JsonHasChanges([], [])).toBe(false);
    expect(JsonHasChanges("a", "a")).toBe(false);
    expect(JsonHasChanges(undefined, undefined)).toBe(false);
  });

  it("finds a change of value, type, length or keys", () => {
    expect(JsonHasChanges({ a: { b: 1 } }, { a: { b: 2 } })).toBe(true);
    expect(JsonHasChanges({ a: [1] }, { a: { 0: 1 } })).toBe(true);
    expect(JsonHasChanges([1, 2], [1, 2, 3])).toBe(true);
    expect(JsonHasChanges([2, 1], [1, 2])).toBe(true);
    expect(JsonHasChanges({ a: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(JsonHasChanges({ a: 1, b: 2 }, { a: 1 })).toBe(true);
    expect(JsonHasChanges({ a: 1 }, { b: 1 })).toBe(true);
    expect(JsonHasChanges(null, {})).toBe(true);
  });

  it("counts an undefined property as absent", () => {
    expect(JsonHasChanges({ a: 1, b: undefined }, { a: 1 })).toBe(false);
    expect(JsonHasChanges({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(JsonHasChanges({ a: undefined }, { b: undefined })).toBe(false);
    expect(JsonHasChanges({ b: undefined }, { b: 1 })).toBe(true);
  });

  it("doesn't read a key the old value only inherits", () => {
    expect(JsonHasChanges({ constructor: Object }, {})).toBe(true);
  });

  it("stops at the first change", () => {
    let reads = 0;
    const tail = new Proxy({}, { ownKeys: () => (reads++, []) });
    expect(JsonHasChanges([1, tail], [2, {}])).toBe(true);
    expect(reads).toBe(0);
  });
});

describe("JsonDiff moves in long arrays", () => {
  /** The moves the diff made with `indexOf` for every array: each old element's first index in the new array */
  function indexOfMoves(newValue: unknown[], oldValue: unknown[]) {
    let start = 0;
    for (; start < newValue.length && start < oldValue.length && newValue[start] === oldValue[start]; start++) { }
    const moves: [number, number][] = [];
    for (let x = start; x < oldValue.length; x++) {
      const index = newValue.indexOf(oldValue[x], start);
      if (index >= 0 && index !== x) moves.push([x, index]);
    }
    return moves;
  }

  const movesOf = (diff: ReturnType<typeof JsonDiff>) =>
    diff.filter((d): d is JsonMove => d.type === "move").map((d) => [d.sourceProp, d.targetProp]);

  it("moves each element as indexOf would find it, repeated and missing values included", () => {
    const rows = Array.from({ length: 200 }, (_, x) => ({ x }));
    const oldValue: unknown[] = [...rows, "a", "b", "a", 1, 1, NaN, rows[3]];
    const newValue: unknown[] = [{ x: -1 }, "a", ...rows.slice(0, 100).reverse(), NaN, 1, "b", ...rows.slice(150), "a", rows[3]];

    const diff = JsonDiff(newValue, oldValue);
    expect(movesOf(diff)).toEqual(indexOfMoves(newValue, oldValue));

    const destination = structuredClone(oldValue);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual(newValue);
  });

  it("diffs only the changed middle of an array of the same length", () => {
    const rows = Array.from({ length: 1000 }, (_, x) => ({ x }));
    const changed = rows.slice();
    changed[500] = { x: -1 };
    expect(JsonDiff(changed, rows)).toEqual([{ type: "write", path: [500, "x"], value: -1 }]);

    const swapped = rows.slice();
    [swapped[100], swapped[900]] = [rows[900], rows[100]];
    const diff = JsonDiff(swapped, rows);
    expect(movesOf(diff)).toEqual([[100, 900], [900, 100]]);
    const destination = structuredClone(rows);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual(swapped);
  });

  it("moves every element of a long array an insert at the start shifts", () => {
    const rows = Array.from({ length: 5000 }, (_, x) => ({ x }));
    const diff = JsonDiff([{ x: -1 }, ...rows], rows);

    expect(movesOf(diff)).toEqual(rows.map((_, x) => [x, x + 1]));
    const destination = structuredClone(rows);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual([{ x: -1 }, ...rows]);
  });
});

describe("JsonDiffInto and JsonDiffOrder", () => {
  it("diff several values into one result, then order it moves first, each in the order found", () => {
    const a = { x: 1 };
    const b = { x: 2 };
    const result: JsonDiffResult = [];
    JsonDiffInto({ n: 2 }, { n: 1 }, ["first"], result);
    JsonDiffInto([b, a], [a, b], ["second"], result);
    JsonDiffInto("v", undefined, ["third"], result);
    expect(result.map((r) => r.type)).toEqual(["write", "move", "move", "write"]);

    expect(JsonDiffOrder(result)).toBe(result);
    expect(result).toEqual([
      { type: "move", path: ["second"], sourceProp: 0, targetProp: 1 },
      { type: "move", path: ["second"], sourceProp: 1, targetProp: 0 },
      { type: "write", path: ["first", "n"], value: 2 },
      { type: "write", path: ["third"], value: "v" },
    ]);
  });
});
