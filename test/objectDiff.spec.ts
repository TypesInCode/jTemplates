/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../src/ObjectStore/objectStoreWorker.types.ts" />

import { ObjectDiff } from "../src/ObjectStore/objectDiff";
import * as chai from "chai";
const expect = chai.expect;

describe("ObjectDiff", () => {
  it("Basic Diff", () => {
    var resp = ObjectDiff("root", { id: "first", value: "third" }, { id: "first", value: "second" }, (val: any) => val.id);
    expect(resp.changedPaths.length).to.equal(1);
  });
});