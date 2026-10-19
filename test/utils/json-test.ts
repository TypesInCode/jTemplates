import { describe, it, expect } from "vitest";
import { JsonApplyDiff, JsonDiff } from "../../src/Utils/json";

// Computing a diff doesn't take ownership of its inputs: a record references the new value.
describe("JsonDiff record ownership", () => {
  it("references the new value rather than copying it", () => {
    const value = { a: { x: 1 } };
    const [record] = JsonDiff(value, undefined);

    expect(record.value).toBe(value);
  });

  it("references a nested part of the new value", () => {
    const child = { x: 2 };
    const diff = JsonDiff({ a: child, b: 1 } as any, { a: 1, b: 1 } as any);

    expect(diff).toEqual([{ path: ["a"], value: { x: 2 } }]);
    expect(diff[0].value).toBe(child);
  });

  it("keeps an undefined value undefined", () => {
    const diff = JsonDiff({ a: 1, b: undefined } as any, { a: 1, b: 2 } as any);

    expect(diff).toEqual([{ path: ["b"], value: undefined }]);
  });
});

// A diff doesn't own its values, so applying one clones each value it writes.
describe("JsonApplyDiff cloning", () => {
  const noop = () => {};

  it("doesn't share a record's value with the root", () => {
    const child = { x: 2 };
    const root: any = { a: 1 };
    JsonApplyDiff(root, [{ path: ["a"], value: child }], noop);

    expect(root.a).toEqual(child);
    expect(root.a).not.toBe(child);
  });

  it("doesn't share one object between two records it applies", () => {
    const shared = { x: 1 };
    const root: any = {};
    JsonApplyDiff(root, [{ path: ["a"], value: shared }, { path: ["b"], value: shared }], noop);

    expect(root.a).not.toBe(root.b);
    expect(root.a).not.toBe(shared);
  });

  it("doesn't share a root replacement's contents with the record", () => {
    const child = { x: 1 };
    const root: any = { a: 0 };
    JsonApplyDiff(root, [{ path: [], value: { a: child } }], noop);

    expect(root.a).toEqual(child);
    expect(root.a).not.toBe(child);
  });
});
