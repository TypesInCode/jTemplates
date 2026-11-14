import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableScope } from "../../src/Store/Tree/observableScope";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";

function KeyFunc(val: any) {
  return val._id;
}

describe("Store Sync Test", () => {
  it("Default Test", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    const init = sync.Get('root');
    expect(init).to.eq(undefined);
    const data = [
      { _id: "first", value: "first" },
      { _id: "second", value: "second" },
    ];
    sync.Write(data, "root");
    const root = sync.Get<{ _id: string; value: string }[]>("root");
    expect(root?.length).to.eq(2);
    expect(root?.[0].value).to.eq("first");
  });
  it("Write Test", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });

    const data = [
      { _id: "first", value: "first" },
      { _id: "second", value: "second" },
    ];
    sync.Write(data, 'root');

    sync.Write({ _id: "first", value: "first changed" });

    const root = sync.Get<{ _id: string; value: string }[]>('root');
    expect(root?.length).to.eq(2);
    expect(root?.[0].value).to.eq("first changed");
  });
  it("Shared Object Test", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    const data = {
      value1: { _id: "first", value: "first" },
      value2: { _id: "second", value: "second" },
      value3: { _id: "first", value: "first changed" },
    };
    sync.Write(data, "root");

    const root = sync.Get("root") as typeof data;
    expect(root.value1.value).to.eq("first changed");
    expect(root.value3.value).to.eq("first changed");

    sync.Write({ _id: "first", value: "first changed again" });

    expect(root.value1.value).to.eq("first changed again");
    expect(root.value3.value).to.eq("first changed again");
    expect(root.value2.value).to.eq("second");
  });
  it("Array Push", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    const data = [{ _id: "first", value: "first" }];
    sync.Write(data, "root");

    const root = sync.Get("root") as typeof data;
    expect(root.length).to.eq(1);

    sync.Push("root", { _id: "second", value: "second" }, { _id: "third", value: "third" });

    expect(root.length).to.eq(3);
    expect(root[1].value).to.eq("second");
    expect(root[2].value).to.eq("third");
  });
  it("Array Observable Scope", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });

    const arrayLength = ObservableScope.Create(() => sync.Get<typeof data>("root")?.length || 0);
    expect(ObservableScope.Value(arrayLength)).to.eq(0);

    const data = [{ _id: "first", value: "first" }];
    sync.Write(data, "root");
    expect(ObservableScope.Value(arrayLength)).to.eq(1);

    sync.Push("root", { _id: "second", value: "second" });
    expect(ObservableScope.Value(arrayLength)).to.eq(2);
  });
  it("Separate Arrays", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    const data1 = [{ _id: "first", value: "first" }];
    const data2 = [{ _id: "first", value: "first" }, { _id: "second", value: "second" }];
    sync.Write(data1, "root1");
    sync.Write(data2, "root2");

    const root1 = sync.Get<typeof data1>("root1");
    const root2 = sync.Get<typeof data2>("root2");

    expect(root1?.length).to.eq(1);
    expect(root2?.length).to.eq(2);

    sync.Write({ _id: "first", value: "first changed" });

    expect(root1?.length).to.eq(1);
    expect(root1?.[0].value).to.eq("first changed");
    expect(root2?.length).to.eq(2);
    expect(root2?.[0].value).to.eq("first changed");

    sync.Push('root1', { _id: "second", value: "second changed" });
    expect(root1?.length).to.eq(2);
    expect(root2?.length).to.eq(2);
    expect(root2?.[1].value).to.eq("second changed");

    sync.Splice('root1', 0, 1);
    expect(root1?.length).to.eq(1);
    expect(root1?.[0].value).to.eq("second changed");
  });
  it("Patch value", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    const data1 = [{ _id: "first", value: "first" }];
    const data2 = [{ _id: "first", value: "first" }, { _id: "second", value: "second" }];
    sync.Write(data1, "root1");
    sync.Write(data2, "root2");

    sync.Patch("first", { value: "first changed" });
    const root1 = sync.Get<typeof data1>("root1");
    const root2 = sync.Get<typeof data2>("root2");

    expect(root1?.[0].value).to.eq("first changed");
    expect(root2?.[0].value).to.eq("first changed");
  });
});

describe("Store Sync keyed arrays", () => {
  it("Reordering a keyed array moves the Store's nodes and keeps them live", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    sync.Write([{ _id: "a", value: "a" }, { _id: "b", value: "b" }, { _id: "c", value: "c" }], "list");
    const list = sync.Get<{ _id: string; value: string }[]>("list")!;
    const scope = ObservableScope.Create(() => list.map((item) => item.value));
    expect(ObservableScope.Value(scope)).to.deep.eq(["a", "b", "c"]);

    sync.Write([{ _id: "c", value: "c" }, { _id: "a", value: "a" }, { _id: "b", value: "b" }], "list");
    expect(ObservableScope.Value(scope)).to.deep.eq(["c", "a", "b"]);

    sync.Write({ _id: "c", value: "c changed" });
    expect(ObservableScope.Value(scope)).to.deep.eq(["c changed", "a", "b"]);
    expect(sync.Get<any>("c").value).to.eq("c changed");
  });

  it("Editing a keyed entity's field updates its readers without firing the array's scope", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    sync.Write([{ _id: "a", value: "a" }, { _id: "b", value: "b" }, { _id: "c", value: "c" }], "list");
    const list = sync.Get<{ _id: string; value: string }[]>("list")!;
    let listReads = 0;
    const ids = ObservableScope.Create(() => (listReads++, list.map((item) => item._id)));
    const b = ObservableScope.Create(() => list[1].value);
    expect(ObservableScope.Value(ids)).to.deep.eq(["a", "b", "c"]);
    expect(ObservableScope.Value(b)).to.eq("b");

    sync.Write("b changed", "b.value");
    expect(ObservableScope.Value(b)).to.eq("b changed");
    expect(ObservableScope.Value(ids)).to.deep.eq(["a", "b", "c"]);

    sync.Write([{ _id: "a", value: "a changed" }, { _id: "b", value: "b changed" }, { _id: "c", value: "c" }], "list");
    expect(list[0].value).to.eq("a changed");
    expect(ObservableScope.Value(ids)).to.deep.eq(["a", "b", "c"]);
    expect(listReads).to.eq(1);
  });

  it("Removing and adding keyed entities updates the Store's array", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    sync.Write([{ _id: "a", value: "a" }, { _id: "b", value: "b" }], "list");
    sync.Write([{ _id: "b", value: "b" }, { _id: "d", value: "d" }], "list");

    expect(sync.Get<any[]>("list")!.map((item) => item.value)).to.deep.eq(["b", "d"]);
  });
});

describe("Store Sync deletes", () => {
  it("Writing a record without an entry removes it from the store and updates its readers", () => {
    const sync = new StoreSync(undefined, { keyFunc: KeyFunc });
    sync.Write({ a: { x: 1 }, b: { x: 2 } }, "positions");
    const positions = sync.Get<Record<string, { x: number }>>("positions")!;
    const keys = ObservableScope.Create(() => Object.keys(positions));
    const a = ObservableScope.Create(() => positions.a.x);
    expect(ObservableScope.Value(keys)).to.deep.eq(["a", "b"]);
    expect(ObservableScope.Value(a)).to.eq(1);

    sync.Write({ a: { x: 1 } }, "positions");

    expect(ObservableScope.Value(keys)).to.deep.eq(["a"]);
    expect("b" in positions).to.eq(false);
    expect(ObservableScope.Value(a)).to.eq(1);
  });
});

describe("StoreSync's tree and keyFunc", () => {
  it("takes the keyFunc of a tree it's given, and leaves the tree when destroyed", () => {
    const tree = new ObservableDiffTree({ keyFunc: KeyFunc });
    const sync = new StoreSync(tree);
    expect(sync.Tree).to.eq(tree);
    sync.Write([{ _id: "first", value: 1 }], "root");
    sync.Write({ _id: "first", value: 2 });
    expect(sync.Get<{ value: number }[]>("root")?.[0].value).to.eq(2);

    sync.Destroy();
    tree.WritePath("other", true);
    tree.Commit();
    expect(sync.Get("other")).to.eq(undefined);
  });

  it("throws for a keyFunc in the options when the tree it's given has its own", () => {
    expect(() => new StoreSync(new ObservableDiffTree({ keyFunc: KeyFunc }), { keyFunc: KeyFunc })).toThrow("leave it out of the options");
    expect(() => new StoreSync(new ObservableDiffTree(), { keyFunc: KeyFunc })).toThrow("leave it out of the options");
  });

  it("marks the empty tree it creates with its opaque keys", () => {
    const sync = new StoreSync(undefined, { opaque: ["view"] });
    sync.Write({ items: [1] }, "view");
    sync.Write({ items: [1, 2] }, "view");
    expect(sync.Tree.Committed("view")).to.deep.eq({ items: [1, 2] });
    expect(sync.Get<{ items: number[] }>("view")?.items).to.deep.eq([1, 2]);
  });
});
