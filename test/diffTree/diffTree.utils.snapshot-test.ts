import { describe, expect, it } from "vitest";
import { ApplyValueToPath, ReadPath } from '../../src/Store/Diff/utils/diffTree.utils';
import { Snapshot } from "../../src/Store/Tree/snapshot";

describe("DiffTree Utils Snapshots", () => {
  const keyFunc = (data: any) => data?.id ? `/${data.id}` : undefined;

  it("Rewriting a keyed value elsewhere invalidates snapshots of its slots", () => {
    const snapshot = Snapshot.Create();
    const obj = {} as { [key: string]: any };

    ApplyValueToPath(snapshot, obj, () => keyFunc, '/First/Second/', 'wrap', { item: { id: "MY_ID", value: "test" } });
    expect(ReadPath(obj, '/First/Second/wrap.item')).toBe(ReadPath(obj, '/MY_ID'));
    const before = Snapshot.Get(snapshot, ReadPath(obj, '/First/Second/wrap'));
    expect(before.item.value).toEqual("test");

    // Writing the whole keyed value elsewhere updates its home in place
    ApplyValueToPath(snapshot, obj, () => keyFunc, '/First/Second/', 'other', { id: "MY_ID", value: "CHANGED" });
    expect(ReadPath(obj, '/MY_ID.value')).toEqual("CHANGED");

    const after = Snapshot.Get(snapshot, ReadPath(obj, '/First/Second/wrap'));
    expect(after).not.toBe(before);
    expect(after.item.value).toEqual("CHANGED");
  });
});
