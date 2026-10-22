import { describe, expect, it } from "vitest";
import { ApplyValueToPath, CreateKeyResolver, ReadPath, ToSnapshotPath } from '../../src/Store/Diff/utils/diffTree.utils';
import { Snapshot } from "../../src/Store/Tree/snapshot";

describe("DiffTree Utils Snapshots", () => {
  const keyFunc = (data: any) => data?.id ? `/${data.id}` : undefined;

  it("Replacing a keyed root copy invalidates snapshots that resolved through it", () => {
    const snapshot = Snapshot.Create();
    const obj = {} as { [key: string]: any };
    const resolve = CreateKeyResolver(obj, () => keyFunc);

    ApplyValueToPath(snapshot, obj, () => keyFunc, '/First/Second/', 'wrap', { item: { id: "MY_ID", value: "test" } });
    const before = Snapshot.Get(snapshot, ReadPath(obj, '/First/Second/wrap'), resolve, ToSnapshotPath('/First/Second/wrap'));
    expect(before.item.value).toEqual("test");

    // Writing the whole keyed value elsewhere replaces the root copy at /MY_ID
    ApplyValueToPath(snapshot, obj, () => keyFunc, '/First/Second/', 'other', { id: "MY_ID", value: "CHANGED" });
    expect(ReadPath(obj, '/MY_ID.value')).toEqual("CHANGED");

    const after = Snapshot.Get(snapshot, ReadPath(obj, '/First/Second/wrap'), resolve, ToSnapshotPath('/First/Second/wrap'));
    expect(after).not.toBe(before);
    expect(after.item.value).toEqual("CHANGED");
  });
});
