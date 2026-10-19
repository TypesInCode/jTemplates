import { describe, it, expect } from "vitest";
import { JsonDiff } from "../../src/Utils/json";

// Computing a diff doesn't take ownership of its inputs: each record's value is a clone.
describe("JsonDiff record ownership", () => {
  it("doesn't share a record's value with the new value", () => {
    const value = { a: { x: 1 } };
    const [record] = JsonDiff(value, undefined);

    expect(record.value).toEqual(value);
    expect(record.value).not.toBe(value);
    expect((record.value as any).a).not.toBe(value.a);
  });

  it("doesn't share a nested record's value with the new value", () => {
    const child = { x: 2 };
    const diff = JsonDiff({ a: child, b: 1 } as any, { a: 1, b: 1 } as any);

    expect(diff).toEqual([{ path: ["a"], value: { x: 2 } }]);
    expect(diff[0].value).not.toBe(child);
  });

  it("doesn't share an object between two records built from the same value", () => {
    const shared = { x: 1 };
    const diff: any[] = [];
    JsonDiff(shared, undefined, "first", diff);
    JsonDiff(shared, undefined, "second", diff);

    expect(diff[0].value).not.toBe(diff[1].value);
  });

  it("keeps an undefined value undefined", () => {
    const diff = JsonDiff({ a: 1, b: undefined } as any, { a: 1, b: 2 } as any);

    expect(diff).toEqual([{ path: ["b"], value: undefined }]);
  });
});
