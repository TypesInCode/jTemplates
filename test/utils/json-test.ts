import { describe, it, expect } from "vitest";
import { JsonApplyDiff, JsonApplySplices, JsonDiff, JsonDiffInto, JsonDiffResult, JsonHasChanges, JsonWrite, SPLICE_ACTION } from "../../src/Utils/json";

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

  it("throws for a write or delete at the empty path: the root is only changed inside", () => {
    expect(() => JsonApplyDiff({ a: 0 }, [{ type: "write", path: [], value: { a: 1 } }])).toThrow();
    expect(() => JsonApplyDiff({ a: 0 }, [{ type: "delete", path: [] }])).toThrow();
  });

  it("records a root write only when the root's type changes", () => {
    expect(JsonDiff([1], { a: 1 } as any)).toEqual([{ type: "write", path: [], value: [1] }]);
    expect(JsonDiff({ b: 2 }, { a: 1 })).toEqual([
      { type: "delete", path: ["a"] },
      { type: "write", path: ["b"], value: 2 },
    ]);
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

describe("JsonDiff arrays by position", () => {
  function roundTrip(newValue: any, oldValue: any) {
    const destination = structuredClone(oldValue);
    const diff = JsonDiff(newValue, oldValue);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual(newValue);
    return diff;
  }

  it("diffs an element inserted at the start against the element at each position", () => {
    const source = { data: [{ x: 1, y: 0 }, { x: 2, y: 0 }] };
    const diff = roundTrip({ data: [{ x: 3, y: 0 }, ...source.data] }, source);

    expect(diff).toEqual([
      { type: "write", path: ["data", 0, "x"], value: 3 },
      { type: "write", path: ["data", 1, "x"], value: 1 },
      { type: "write", path: ["data", 2], value: { x: 2, y: 0 } },
      { type: "write", path: ["data", "length"], value: 3 },
    ]);
  });

  it("writes swapped values in place, without moves", () => {
    const source = { data: [{ x: 1 }, { x: 2 }] };
    const diff = roundTrip({ data: [source.data[1], source.data[0]] }, source);

    expect(diff).toEqual([
      { type: "write", path: ["data", 0, "x"], value: 2 },
      { type: "write", path: ["data", 1, "x"], value: 1 },
    ]);
  });

  it("round-trips an insert in the middle and a swap with an insert", () => {
    const source = { data: [{ x: 1 }, { x: 2 }] };
    roundTrip({ data: [source.data[0], { x: 3 }, source.data[1]] }, source);
    roundTrip({ data: [source.data[1], { x: 3 }, source.data[0]] }, source);
  });

  it("diffs only the changed middle of an array of the same length", () => {
    const rows = Array.from({ length: 1000 }, (_, x) => ({ x }));
    const changed = rows.slice();
    changed[500] = { x: -1 };
    expect(JsonDiff(changed, rows)).toEqual([{ type: "write", path: [500, "x"], value: -1 }]);

    const swapped = rows.slice();
    [swapped[100], swapped[900]] = [rows[900], rows[100]];
    expect(roundTrip(swapped, rows)).toEqual([
      { type: "write", path: [100, "x"], value: 900 },
      { type: "write", path: [900, "x"], value: 100 },
    ]);
  });

  it("writes only the length of an array that only shrinks", () => {
    const rows = [{ x: 1 }, { x: 2 }, { x: 3 }];
    expect(roundTrip(rows.slice(0, 1), rows)).toEqual([{ type: "write", path: ["length"], value: 1 }]);
  });

  it("writes appended elements and the length", () => {
    const rows = [{ x: 1 }];
    expect(roundTrip([...rows, { x: 2 }], rows)).toEqual([
      { type: "write", path: [1], value: { x: 2 } },
      { type: "write", path: ["length"], value: 2 },
    ]);
  });

  it("diffs every position of a long array an insert at the start shifts", () => {
    const rows = Array.from({ length: 5000 }, (_, x) => ({ x }));
    const diff = roundTrip([{ x: -1 }, ...rows], rows);

    // One write per shifted row, the appended last row, and the length
    expect(diff.length).toBe(5002);
  });

  it("writes each position of an array whose every element changed", () => {
    const first = { x: 3 };
    expect(roundTrip([first, "b"], [1, { y: 1 }])).toEqual([
      { type: "write", path: [0], value: first },
      { type: "write", path: [1], value: "b" },
    ]);
  });

  it("writes each element into an empty array, and only the length to empty one", () => {
    expect(roundTrip([1, 2], [])).toEqual([
      { type: "write", path: [0], value: 1 },
      { type: "write", path: [1], value: 2 },
      { type: "write", path: ["length"], value: 2 },
    ]);
    expect(roundTrip([], [1, 2])).toEqual([{ type: "write", path: ["length"], value: 0 }]);
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

describe("JsonDiff identity", () => {
  const byId = (value: any) => typeof value === "object" && value !== null ? value.id : value;
  const splice = (value: any) => Array.isArray(value) ? "splice" as const : undefined;

  it("is passed to the splices of an array the strategy splices", () => {
    const diff = JsonDiff({ list: [{ id: 2 }, { id: 1, v: 2 }] }, { list: [{ id: 1, v: 1 }, { id: 2 }] }, undefined, splice, byId);

    expect(diff).toEqual([{
      type: "splice",
      path: ["list"],
      splices: [{ index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 1 }] }, { index: 2, delete: 1, insert: [] }]
    }]);
  });

  it("records nothing for a spliced array whose elements changed but kept their identities", () => {
    expect(JsonDiff({ list: [{ id: 1, v: 2 }] }, { list: [{ id: 1, v: 1 }] }, undefined, splice, byId)).toEqual([]);
  });

  it("isn't used for arrays diffed by position", () => {
    expect(JsonDiff({ list: [{ id: 1, v: 2 }] }, { list: [{ id: 1, v: 1 }] }, undefined, undefined, byId))
      .toEqual([{ type: "write", path: ["list", 0, "v"], value: 2 }]);
  });

  it("is passed on by JsonDiffInto", () => {
    const result: JsonDiffResult = [];
    JsonDiffInto([{ id: 1, v: 2 }], [{ id: 1, v: 1 }], ["list"], result, splice, byId);

    expect(result).toEqual([]);
  });
});

describe("JsonDiff strategy", () => {
  it("isn't called for primitives or unchanged values", () => {
    const shared = { a: 1 };
    const seen: any[] = [];
    JsonDiff({ n: 2, s: shared, o: { a: 2 } }, { n: 1, s: shared, o: { a: 1 } }, undefined, (newValue, _old, path) => {
      seen.push([path.slice(), newValue]);
      return undefined;
    });

    expect(seen).toEqual([[[], { n: 2, s: shared, o: { a: 2 } }], [["o"], { a: 2 }]]);
  });

  it("diffs as usual when it returns undefined or diff", () => {
    const newValue = { a: { b: 2, c: 1 } };
    const oldValue = { a: { b: 1, c: 1 } };
    const expected = [{ type: "write", path: ["a", "b"], value: 2 }];

    expect(JsonDiff(newValue, oldValue, undefined, () => undefined)).toEqual(expected);
    expect(JsonDiff(newValue, oldValue, undefined, () => "diff")).toEqual(expected);
  });

  it("records nothing for a value it skips", () => {
    const diff = JsonDiff({ a: { id: 1, v: 2 }, b: 2 }, { a: { id: 1, v: 1 }, b: 1 }, undefined,
      (value) => value.id !== undefined ? "skip" : undefined);

    expect(diff).toEqual([{ type: "write", path: ["b"], value: 2 }]);
  });

  it("writes a value as is", () => {
    const a = { b: 2, c: 1 };
    const diff = JsonDiff({ a }, { a: { b: 1, c: 1 } }, undefined, (_value, _old, path) => path.length === 1 ? "write" : undefined);

    expect(diff).toEqual([{ type: "write", path: ["a"], value: a }]);
    expect((diff[0] as JsonWrite).value).toBe(a);
  });

  it("applies at every depth, including array elements", () => {
    const diff = JsonDiff([{ id: 1, v: 2 }, { v: 2 }], [{ id: 1, v: 1 }, { v: 1 }], undefined,
      (value) => value.id !== undefined ? "skip" : undefined);

    expect(diff).toEqual([{ type: "write", path: [1, "v"], value: 2 }]);
  });

  it("splices an array without walking into its elements", () => {
    const a = { x: 1 };
    const b = { x: 2 };
    const c = { x: 3 };
    const diff = JsonDiff({ list: [c, a, b] }, { list: [a, b] }, undefined, (value) => Array.isArray(value) ? "splice" : undefined);

    expect(diff).toEqual([{
      type: "splice",
      path: ["list"],
      splices: [{ index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: c }] }]
    }]);
  });

  it("records no splice for a new array holding the same elements", () => {
    const a = { x: 1 };
    expect(JsonDiff({ list: [a] }, { list: [a] }, undefined, () => "splice")).toEqual([]);
  });

  it("writes an array spliced over a value that isn't one", () => {
    const list = [1];
    expect(JsonDiff({ list }, { list: { 0: 1 } } as any, undefined, (value) => Array.isArray(value) ? "splice" : undefined))
      .toEqual([{ type: "write", path: ["list"], value: list }]);
  });

  it("diffs an object it's asked to splice", () => {
    expect(JsonDiff({ a: 2 }, { a: 1 }, undefined, () => "splice")).toEqual([{ type: "write", path: ["a"], value: 2 }]);
  });
});

describe("JsonApplyDiff splice records", () => {
  const splice = (value: any) => Array.isArray(value) ? "splice" as const : undefined;

  function roundTrip(newValue: any, oldValue: any) {
    const destination = structuredClone(oldValue);
    const diff = JsonDiff(newValue, oldValue, undefined, splice);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual(newValue);
    return destination;
  }

  it("round-trips spliced arrays at any depth", () => {
    const [a, b, c, d] = [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }];
    roundTrip({ list: [d, a, c] }, { list: [a, b, c, d] });
    roundTrip({ n: { list: [c, b, a] } }, { n: { list: [a, b, c] } });
    roundTrip([3, 1, 2], [1, 2, 3]);
    roundTrip({ list: [] }, { list: [a, b] });
    roundTrip({ list: [a, b] }, { list: [] });
  });

  it("splices the array in place, keeping moved elements and cloning inserted ones", () => {
    const destination: any = { list: [{ x: 1 }, { x: 2 }] };
    const [first, second] = destination.list;
    const array = destination.list;
    const inserted = { x: 3 };
    JsonApplyDiff(destination, [{
      type: "splice",
      path: ["list"],
      splices: [
        // [first, second] → [second, inserted, first, second] → [second, inserted, first]
        { index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 1 }, { type: SPLICE_ACTION.INSERT, value: inserted }] },
        { index: 3, delete: 1, insert: [] },
      ]
    }]);

    expect(destination.list).toBe(array);
    expect(array).toEqual([{ x: 2 }, { x: 3 }, { x: 1 }]);
    expect(array[0]).toBe(second);
    expect(array[2]).toBe(first);
    expect(array[1]).not.toBe(inserted);
  });

  it("calls spliced with each array it changed", () => {
    const destination: any = { a: [1, 2], b: [3] };
    const seen: unknown[] = [];
    JsonApplyDiff(destination, JsonDiff({ a: [2], b: [3, 4] }, destination, undefined, splice), undefined, undefined, array => seen.push(array));

    expect(seen).toEqual([destination.a, destination.b]);
    expect(seen[0]).toBe(destination.a);
  });

  it("applies records in order, writes and splices mixed", () => {
    const destination: any = { list: [1, 2], v: 1, w: { y: 1 } };
    JsonApplyDiff(destination, [
      { type: "write", path: ["v"], value: 2 },
      { type: "splice", path: ["list"], splices: [{ index: 0, delete: 1, insert: [] }] },
      { type: "write", path: ["w", "y"], value: 2 },
    ]);

    expect(destination).toEqual({ list: [2], v: 2, w: { y: 2 } });
  });

  it("writes under a value an earlier record in the same diff replaced", () => {
    const destination: any = { a: { x: 1 } };
    const old = destination.a;
    JsonApplyDiff(destination, [
      { type: "write", path: ["a", "x"], value: 2 },
      { type: "write", path: ["a"], value: { x: 3 } },
      { type: "write", path: ["a", "y"], value: 4 },
    ]);

    expect(destination.a).toEqual({ x: 3, y: 4 });
    expect(old).toEqual({ x: 2 });
  });

  it("splices at the end when an index is past it, and deletes only what's there", () => {
    const array = [1, 2];
    JsonApplySplices(array, [{ index: 5, delete: 3, insert: [{ type: SPLICE_ACTION.INSERT, value: 3 }] }]);
    expect(array).toEqual([1, 2, 3]);

    JsonApplySplices(array, [{ index: 1, delete: 10, insert: [] }]);
    expect(array).toEqual([1]);
  });

  it("throws for splices out of order or a path that isn't an array", () => {
    expect(() => JsonApplySplices([1, 2, 3], [
      { index: 2, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: 9 }] },
      { index: 1, delete: 1, insert: [] },
    ])).toThrow();
    expect(() => JsonApplyDiff({ a: {} }, [{ type: "splice", path: ["a"], splices: [] }])).toThrow();
  });

  it("inserts more items than fit in a call's arguments", () => {
    const items = Array.from({ length: 300000 }, (_, x) => x);
    const array: number[] = [];
    JsonApplySplices(array, [{ index: 0, delete: 0, insert: items.map(value => ({ type: SPLICE_ACTION.INSERT, value })) }]);
    expect(array.length).toBe(items.length);
  });
});

describe("JsonDiff deletes", () => {
  function roundTrip(newValue: any, oldValue: any) {
    const destination = structuredClone(oldValue);
    const diff = JsonDiff(newValue, oldValue);
    JsonApplyDiff(destination, diff);
    expect(destination).toEqual(newValue);
    return { diff, destination };
  }

  it("deletes a key the new value doesn't have, keeping the rest of the object", () => {
    const { diff, destination } = roundTrip({ a: 1, c: 3 }, { a: 1, b: 2, c: 3 });

    expect(diff).toEqual([{ type: "delete", path: ["b"] }]);
    expect(Object.hasOwn(destination, "b")).toBe(false);
  });

  it("deletes, writes and diffs keys in one object", () => {
    const { diff } = roundTrip({ a: { x: 2 }, c: 3 }, { a: { x: 1 }, b: 2 });

    expect(diff).toEqual([
      { type: "write", path: ["a", "x"], value: 2 },
      { type: "delete", path: ["b"] },
      { type: "write", path: ["c"], value: 3 },
    ]);
  });

  it("diffs keys that sort after a deleted one", () => {
    expect(roundTrip({ b: { v: 2, w: 1 } }, { a: 1, b: { v: 1, w: 1 } }).diff).toEqual([
      { type: "delete", path: ["a"] },
      { type: "write", path: ["b", "v"], value: 2 },
    ]);
  });

  it("deletes a nested key", () => {
    expect(roundTrip({ n: { a: 1 } }, { n: { a: 1, b: 2 } }).diff).toEqual([{ type: "delete", path: ["n", "b"] }]);
  });

  it("deletes and writes each key of an object that shares none with the old one, keeping the object", () => {
    const { diff, destination } = roundTrip({ n: { c: 1 } }, { n: { a: 1, b: 2 } });
    expect(diff).toEqual([
      { type: "delete", path: ["n", "a"] },
      { type: "delete", path: ["n", "b"] },
      { type: "write", path: ["n", "c"], value: 1 },
    ]);
    expect(roundTrip({ n: {} }, { n: { a: 1 } }).diff).toEqual([{ type: "delete", path: ["n", "a"] }]);
    expect(destination.n).toEqual({ c: 1 });
  });

  it("keeps an explicitly undefined value a write, and skips a new key holding undefined", () => {
    expect(JsonDiff({ a: 1, b: undefined } as any, { a: 1, b: 2 } as any)).toEqual([{ type: "write", path: ["b"], value: undefined }]);
    expect(JsonDiff({ a: 1, b: undefined } as any, { a: 1 } as any)).toEqual([]);
  });

  it("deletes entries of a record by key, leaving the others' objects alone", () => {
    const kept = { v: 1 };
    const destination: any = { entries: { a: kept, b: { v: 2 } } };
    JsonApplyDiff(destination, JsonDiff({ entries: { a: { v: 1 } } }, destination));

    expect(destination.entries).toEqual({ a: { v: 1 } });
    expect(destination.entries.a).toBe(kept);
  });

  it("calls remove with each deleted property's parent", () => {
    const destination: any = { n: { a: 1, b: 2 } };
    const removed: [any, string | number][] = [];
    JsonApplyDiff(destination, [{ type: "delete", path: ["n", "b"] }], undefined, (parent, prop) => { removed.push([parent, prop]); delete parent[prop]; });

    expect(removed).toEqual([[destination.n, "b"]]);
    expect(destination.n).toEqual({ a: 1 });
  });
});

describe("JsonDiffInto", () => {
  it("diffs several values into one result, in the order found", () => {
    const result: JsonDiffResult = [];
    JsonDiffInto({ n: 2 }, { n: 1 }, ["first"], result);
    JsonDiffInto([2, 1], [1, 2], ["second"], result);
    JsonDiffInto("v", undefined, ["third"], result);

    expect(result).toEqual([
      { type: "write", path: ["first", "n"], value: 2 },
      { type: "write", path: ["second", 0], value: 2 },
      { type: "write", path: ["second", 1], value: 1 },
      { type: "write", path: ["third"], value: "v" },
    ]);
  });
});
