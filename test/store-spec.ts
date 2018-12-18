/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { Store } from "../src/Store/sync/store";
import * as chai from "chai";
const expect = chai.expect;

describe("Store (Sync)", () => {
  it("Basic Test", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    var query = store.Query(reader => reader.Root.temp);
    expect(query.Value).to.equal("test");
  });
  it("Update", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    var tempQuery = store.Query(reader => reader.Root.temp);
    expect(tempQuery.Value).to.equal("test");

    var rootQuery = store.Query(reader => reader.Root);
    var eventFired = false;
    tempQuery.addListener("set", () => eventFired = true);
    rootQuery.Value.temp = "different";
    expect(tempQuery.Value).to.equal("different");
    expect(eventFired).to.be.true;
  });
  it("Dependent scope", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    var query = store.Query(store => store.Root);
    var scope = query.Scope(parent => parent.temp);

    expect(scope.Value).to.equal("test");
    query.Value.temp = "different";
    expect(scope.Value).to.equal("different");
  });
});