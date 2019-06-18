/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { Store } from "../src/Store/sync/store";
import * as chai from "chai";
const expect = chai.expect;

describe("Store (Sync)", () => {
  it("Basic Test", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    expect(store.Root.Value.temp).to.equal("test");
    store.Destroy();
  });
  it("Update", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" }, (val) => val.id);
    var tempQuery = store.Query("root", reader => reader.Root.temp);
    expect(tempQuery.Value).to.equal("test");

    var eventFired = false;
    tempQuery.addListener("set", () => eventFired = true);
    store.Action(reader => {
        reader.Root.temp = "different";
    });
    expect(tempQuery.Value).to.equal("different");
    expect(eventFired).to.be.true;
    store.Destroy();
  });
  it("Dependent scope", () => {
    var store = Store.Create({ temp: "test", temp2: "test2" });
    var query = store.Query("test", store => store.Root);
    var scope = query.Scope(parent => parent.temp);

    expect(scope.Value).to.equal("test");
    store.Action(reader => {
        reader.Root.temp = "different";
    });
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
  it("Dependent scope array event", () => {
    var store = Store.Create(["first", "second"]);
    var query = store.Query("root", store => store.Root);
    var scope = query.Scope(parent => parent.filter(v => v === "first"));
    var eventFired = false;
    scope.addListener("set", () => {
      eventFired = true;
    });

    expect(scope.Value.length).to.equal(1);
    store.Action((reader, writer) => {
      reader.Root[1] = "first";
    });
    expect(scope.Value.length).to.equal(2);
    expect(eventFired).to.be.true;
    store.Destroy();
  });
  it("Dependent scope array with ID mapping", () => {
    var store = Store.Create([{ id: "first", value: "test1" }, { id: "second", value: "test2" }], (val) => val.id);
    var scope = store.Root.Scope(parent => parent.filter(v => v.value === "changed"));

    expect(scope.Value.length).to.equal(0);
    store.Action((reader, writer) => {
      writer.Push(reader.Root, { id: "first", value: "changed" });
    });
    expect(scope.Value.length).to.equal(2);
    store.Destroy();
  });
});