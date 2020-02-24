/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

// import { ObjectDiff } from "../src/ObjectStore/objectDiff";
import { DiffSync } from "../../src/Store/diff/diffSync";
import * as chai from "chai";
const expect = chai.expect;

describe("ObjectDiff", () => {
  it("Basic Batch Diff", async () => {
    var diff = new DiffSync();
    var resp = await diff.DiffBatch([{ path: "root", oldValue: { id: "first", value: "third" }, newValue: { id: "first", value: "second" } }]);
    expect(resp.changedPaths.length).to.equal(1);
    expect(resp.changedPaths[0]).to.equal("root.value");
  });
  it("Basic Array Diff", async () => {
    var diff = new DiffSync();
    var resp = await diff.DiffBatch([{ path: "root.arr", oldValue: [1, 2], newValue: [null, 2] }]);
    expect(resp.changedPaths.length).to.equal(1);
    expect(resp.changedPaths[0]).to.equal("root.arr.0");
  });
  it("Deleted path", async () => {
    var diff = new DiffSync();
    var resp = await diff.DiffBatch([{ path: "root", oldValue: { prop1: "prop1", prop2: "prop2" }, newValue: { prop1: "prop1" } }]);
    expect(resp.changedPaths.length).to.equal(1);
    expect(resp.deletedPaths.length).to.equal(1);
    expect(resp.changedPaths[0]).to.equal("root");
    expect(resp.deletedPaths[0]).to.equal("root.prop2");
  });
});