import { expect } from "chai";
import "mocha";
import { DiffTreeFactory } from "../../src/Store/Diff/diffTree";
import { JsonDiffFactory, JsonType } from "../../src/Utils/json";

const DiffTreeConstructor = DiffTreeFactory(JsonDiffFactory);

function KeyFunc(val: any) {
  const type = JsonType(val);
  switch (type) {
    case "object":
      return val._id;
    default:
      return undefined;
  }
}

describe("Diff Tree Test", () => {
  it("Default Test", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("", { value: "test" });
    expect(result.length).to.eq(1);
  });
  it("Default Flatten", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("", { _id: "test", value: "test" });
    expect(result.length).to.eq(2);
  });
  it("Default Flatten 02", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    const result = tree.DiffPath("", { data: { _id: "test", value: "test" } });
    expect(result.length).to.eq(2);
  });
  it("Flatten With Update", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("data", { _id: "test", value: "value" });
    console.log(result);
    expect(result.length).to.eq(2);
  });
  it("Flatten With No Update", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("data", { _id: "test", value: "test" });
    console.log(result);
    expect(result.length).to.eq(0);
  });
  it("Update single value", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("", { data: { _id: "test", value: "test" } });

    const result = tree.DiffPath("data.value", "value");
    console.log(result);
    expect(result.length).to.eq(1);
  });
  it("Duplicate object - Update single value", () => {
    const tree = new DiffTreeConstructor(KeyFunc);
    tree.DiffPath("", {
      data: { _id: "test", value: "test" },
      data2: { _id: "test", value: "test" },
    });

    const result = tree.DiffPath("data.value", "value");
    console.log(result);
    expect(result.length).to.eq(2);

    const result2 = tree.DiffPath("data2", {
      _id: "uniqueId",
      value: "new value",
      test: "test",
    });
    console.log(result2);
    expect(result2.length).to.eq(4);

    const result3 = tree.DiffPath("data2.value", "updated value");
    console.log(result3);
    expect(result3.length).to.eq(2);
  });
});
