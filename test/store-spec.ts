/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { Store } from "../src/Store/sync/store";
import * as chai from "chai";
import { stringify } from "querystring";
const expect = chai.expect;

describe("Store (Sync)", () => {
  it("Basic Test", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    expect(store.Root.temp).to.equal("test");
    store.Destroy();
  });
  it("Update", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" }, (val) => val.id);
    var tempQuery = store.Query("root", reader => reader.Root.temp);
    expect(tempQuery.Value).to.equal("test");

    var eventFired = false;
    tempQuery.addListener("set", () => eventFired = true);
    store.Root.temp = "different";
    expect(tempQuery.Value).to.equal("different");
    expect(eventFired).to.be.true;
    store.Destroy();
  });
  it("Dependent scope", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    var query = store.Query("root", store => store.Root);
    var scope = query.Scope(parent => parent.temp);

    expect(scope.Value).to.equal("test");
    query.Value.temp = "different";
    expect(scope.Value).to.equal("different");
    store.Destroy();
  });
  it("Dependent Scope Array", () => {
    var store = Store.Create(["first", "second"]);
    var query = store.Query("root", store => store.Root);
    var scope = query.Scope(parent => parent.filter(v => v === "first"));

    expect(scope.Value.length).to.equal(1);
    store.Action((reader, writer) => {
      writer.Push(reader.Root, "first");
    });
    expect(scope.Value.length).to.equal(2);
    store.Destroy();
  });
});