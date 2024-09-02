import { expect } from "chai";
import "mocha";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableScope } from "../../src/Store/Tree/observableScope";

function KeyFunc(val: any) {
  return val._id;
}

describe("Store Sync Test", () => {
  it("Default Test", () => {
    const sync = new StoreSync(KeyFunc);
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
    const sync = new StoreSync(KeyFunc);
    
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
    const sync = new StoreSync(KeyFunc);
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
    const sync = new StoreSync(KeyFunc);
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
    const sync = new StoreSync(KeyFunc);

    const arrayLength = ObservableScope.Create(() => sync.Get<typeof data>("root")?.length || 0);
    expect(ObservableScope.Value(arrayLength)).to.eq(0);

    const data = [{ _id: "first", value: "first" }];
    sync.Write(data, "root");
    expect(ObservableScope.Value(arrayLength)).to.eq(1);
    
    sync.Push("root", { _id: "second", value: "second" });
    expect(ObservableScope.Value(arrayLength)).to.eq(2);
  });
  it("Separate Arrays", () => {
    const sync = new StoreSync(KeyFunc);
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

    const result = sync.Splice('root1', 0, 1);
    expect(result.length).to.eq(1);
    expect(root1?.length).to.eq(1);
    expect(root1?.[0].value).to.eq("second changed");
  });
  it("Patch value", () => {
    const sync = new StoreSync(KeyFunc);
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
