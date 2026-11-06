import { describe, it, expect } from "vitest";
import { JsonApplyDiff, JsonDiff, JsonDiffArraySpliceV2, JsonDiffArraysSplice, JsonDiffInto, JsonDiffOrder, JsonDiffResult, JsonHasChanges, JsonMove, JsonWrite, SPLICE_ACTION } from "../../src/Utils/json";

function ApplySplicesToArray(arr: any[], actions: any[]) {
  for (let x = 0; x < actions.length; x++)
    for (let y = 0; y < actions[x].insert.length; y++) {
      const insert = actions[x].insert[y];
      insert.data = insert.type === SPLICE_ACTION.MOVE ? arr[insert.from] : insert.data;
    }

  for (let x = 0; x < actions.length; x++) {
    const splice = actions[x];
    const items = splice.insert.map((item: any) => {
      return item.data;
    });

    arr.splice(splice.index, splice.delete, ...items);
  }
}

// Computing a diff doesn't take ownership of its inputs: a record references the new value.
describe("JsonSplice", () => {
  it("delete 2 elements sort + insert", () => {
    const start = [1, 2, 3, 4, 5];
    const end = [1, 6, 5, 4];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });

  it("delete 2 elements", () => {
    const start = [1, 2, 3, 4, 5];
    const end = [1, 4, 5];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });

  it("insert 1 element", () => {
    const start = [1, 2];
    const end = [1, 3, 2];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });

  it("insert a few non-consecutive elements", () => {
    const start = [1, 2, 3, 4];
    const end = [1, 8, 2, 9, 3, 10, 4];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });

  it("delete + insert an element into an array with duplicates", () => {
    const start = [1, 2, 1, 1];
    const end = [1, 1, 1, 1];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });

  it("random array changes on a medium length array", () => {
    const start = [11, 32, 52, 214, 299, 111, 23, 54, 97];
    const end = [33, 2, 1, 4, 3, 299, 111, 23, 1022, 97, 54];

    const actions = JsonDiffArraySpliceV2(end, start, []);

    ApplySplicesToArray(start, actions);

    expect(actions.length).toBeGreaterThan(0);
    expect(start).toEqual(end);
  });
});
