import { describe, it, expect } from "vitest";
import { JsonDiffArraySplice, JsonSplice, SPLICE_ACTION } from "../../src/Utils/json";

/** Applies splices in order; a moved item is read from the array as it was before any splice */
function ApplySplices<T>(array: T[], splices: JsonSplice[]) {
  const original = array.slice();
  for (const splice of splices) {
    const items = splice.insert.map(item => item.type === SPLICE_ACTION.MOVE ? original[item.from] : item.value as T);
    array.splice(splice.index, splice.delete, ...items);
  }

  return array;
}

function Diff<T>(oldValue: T[], newValue: T[]) {
  const splices = JsonDiffArraySplice(newValue, oldValue);
  expect(ApplySplices(oldValue.slice(), splices)).toEqual(newValue);
  return splices;
}

function Moves(splices: JsonSplice[]) {
  return splices.flatMap(splice => splice.insert.filter(item => item.type === SPLICE_ACTION.MOVE));
}

describe("JsonDiffArraySplice", () => {
  it("splices the example in its comments as described", () => {
    const [A, B, C, D, E, F, X] = ["A", "B", "C", "D", "E", "F", "X"].map(name => ({ name }));

    expect(Diff([A, B, C, D, E, F], [A, E, B, X, D, F])).toEqual([
      { index: 1, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 4 }] },
      { index: 3, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: X }] },
      { index: 5, delete: 1, insert: [] },
    ]);
  });

  it("returns no splices for arrays holding the same elements", () => {
    const a = { x: 1 };
    expect(Diff([], [])).toEqual([]);
    expect(Diff([1, a], [1, a])).toEqual([]);
  });

  it("inserts into and deletes everything from an empty array", () => {
    expect(Diff([], [1, 2])).toEqual([{ index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: 1 }, { type: SPLICE_ACTION.INSERT, value: 2 }] }]);
    expect(Diff([1, 2], [])).toEqual([{ index: 0, delete: 2, insert: [] }]);
  });

  it("deletes trailing elements", () => {
    expect(Diff([1, 2, 3], [1, 2])).toEqual([{ index: 2, delete: 1, insert: [] }]);
    expect(Diff([1, 2, 3, 4], [1])).toEqual([{ index: 1, delete: 3, insert: [] }]);
  });

  it("appends and prepends", () => {
    expect(Diff([1, 2], [1, 2, 3])).toEqual([{ index: 2, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: 3 }] }]);
    expect(Diff([1, 2], [0, 1, 2])).toEqual([{ index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: 0 }] }]);
  });

  it("deletes from the middle", () => {
    expect(Diff([1, 2, 3, 4, 5], [1, 4, 5])).toEqual([{ index: 1, delete: 2, insert: [] }]);
  });

  it("inserts a few non-consecutive elements", () => {
    expect(Diff([1, 2, 3, 4], [1, 8, 2, 9, 3, 10, 4])).toHaveLength(3);
  });

  it("replaces an element", () => {
    expect(Diff([1, 2, 3], [1, 9, 3])).toEqual([{ index: 1, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: 9 }] }]);
  });

  it("moves one element to rotate either way", () => {
    const right = Diff([1, 2, 3, 4, 5], [5, 1, 2, 3, 4]);
    expect(Moves(right)).toEqual([{ type: SPLICE_ACTION.MOVE, from: 4 }]);
    expect(right).toEqual([
      { index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 4 }] },
      { index: 5, delete: 1, insert: [] },
    ]);

    const left = Diff([1, 2, 3, 4, 5], [2, 3, 4, 5, 1]);
    expect(Moves(left)).toEqual([{ type: SPLICE_ACTION.MOVE, from: 0 }]);
  });

  it("swaps two elements with one move", () => {
    const rows = Array.from({ length: 10 }, (_, x) => ({ x }));
    const swapped = rows.slice();
    [swapped[2], swapped[7]] = [rows[7], rows[2]];
    // The run kept in place is rows 0-1, 3-6, 8-9 plus one of the two swapped, so the other moves
    expect(Moves(Diff(rows, swapped)).length).toBeLessThanOrEqual(2);
  });

  it("moves all but one element to reverse", () => {
    expect(Moves(Diff([1, 2, 3, 4], [4, 3, 2, 1]))).toHaveLength(3);
  });

  it("matches repeated values in order", () => {
    expect(Diff([1, 2, 1, 1], [1, 1, 1, 1])).toEqual([{ index: 1, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: 1 }] }]);
    Diff([1, 1, 2], [2, 1]);
    Diff([1, 2, 1], [2, 1, 1]);
    Diff([1, 2, 3, 4, 5], [1, 6, 5, 4]);
  });

  it("matches objects by identity, not by value", () => {
    const a = { x: 1 };
    const b = { x: 2 };
    const splices = Diff([a, b], [b, { x: 1 }]);

    expect(splices).toEqual([{ index: 0, delete: 1, insert: [] }, { index: 1, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: { x: 1 } }] }]);
  });

  it("inserts a value repeated more times than the old array holds it", () => {
    const a = { x: 1 };
    const splices = Diff([a], [a, a]);

    expect(splices).toEqual([{ index: 1, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: a }] }]);
  });

  it("round-trips random changes, repeated values included", () => {
    let seed = 1;
    const random = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;

    for (let run = 0; run < 500; run++) {
      const oldValue = Array.from({ length: random(30) }, () => random(12));
      const newValue = Array.from({ length: random(30) }, () => random(12));
      const splices = Diff(oldValue, newValue);

      const deleted = splices.reduce((total, splice) => total + splice.delete, 0);
      const inserted = splices.reduce((total, splice) => total + splice.insert.length, 0);
      expect(oldValue.length - deleted + inserted).toBe(newValue.length);
    }
  });

  it("diffs a long array with an insert at the start as one splice", () => {
    const rows = Array.from({ length: 5000 }, (_, x) => ({ x }));
    const inserted = { x: -1 };

    expect(Diff(rows, [inserted, ...rows])).toEqual([{ index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.INSERT, value: inserted }] }]);
  });
});

describe("JsonDiffArraySplice identity", () => {
  const byId = (value: any) => typeof value === "object" && value !== null ? value.id : value;

  it("treats elements with the same identity as the same element, even when they changed", () => {
    const oldValue = [{ id: 1, v: 1 }, { id: 2, v: 1 }, { id: 3, v: 1 }];
    const newValue = [{ id: 1, v: 2 }, { id: 2, v: 2 }, { id: 3, v: 2 }];

    expect(JsonDiffArraySplice(newValue, oldValue, byId)).toEqual([]);
  });

  it("trims by identity, so a long array with its first element edited costs one call per element", () => {
    const oldValue = Array.from({ length: 1000 }, (_, id) => ({ id, v: 1 }));
    const newValue = oldValue.map((row, x) => x === 0 ? { ...row, v: 2 } : { ...row });
    let calls = 0;

    expect(JsonDiffArraySplice(newValue, oldValue, (value) => (calls++, value.id))).toEqual([]);
    expect(calls).toBe(2000);
  });

  it("moves an element matched by identity, and inserts the new element when its identity changed", () => {
    const [a, b, c] = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const oldValue = [a, b, c];
    const x = { id: "x" };
    const newValue = [{ id: "c", v: 1 }, { id: "a", v: 1 }, x];
    const splices = JsonDiffArraySplice(newValue, oldValue, byId);

    expect(splices).toEqual([
      { index: 0, delete: 0, insert: [{ type: SPLICE_ACTION.MOVE, from: 2 }] },
      { index: 2, delete: 2, insert: [{ type: SPLICE_ACTION.INSERT, value: x }] },
    ]);
    // A move keeps the old element; an insert holds the new one
    expect(ApplySplices(oldValue.slice(), splices)).toEqual([c, a, x]);
  });

  it("is called for primitives too, and an identity shared by two elements matches them", () => {
    const seen: unknown[] = [];
    const splices = JsonDiffArraySplice(["k", 1], [{ id: "k" }, 1], (value) => (seen.push(value), byId(value)));

    expect(seen).toEqual(expect.arrayContaining(["k", 1, { id: "k" }]));
    expect(splices).toEqual([]);
  });

  it("matches by === with the default identity", () => {
    expect(JsonDiffArraySplice([{ id: 1 }], [{ id: 1 }])).toEqual([
      { index: 0, delete: 1, insert: [{ type: SPLICE_ACTION.INSERT, value: { id: 1 } }] },
    ]);
  });
});
