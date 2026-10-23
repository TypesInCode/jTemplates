import { describe, it, expect } from "vitest";
import { JsonApplyDiff, JsonDiff, JsonWrite } from "../../src/Utils/json";

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
