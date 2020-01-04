/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { StoreSync, Scope } from "../src/Store";
import * as chai from "chai";
import { stringify } from "querystring";
const expect = chai.expect;

describe("Store (Sync)", () => {
  it("Basic Test", async () => {
    var store = new StoreSync({ firstProperty: 'old value', secondProperty: 'second old value' });
    expect(store.Root.Value.firstProperty).to.equal('old value');
    expect(store.Root.Value.secondProperty).to.equal('second old value');
    store.Destroy();
  });
  it("Basic Scope - Update", async () => {
    var store = new StoreSync({ firstProperty: 'old value', secondProperty: 'second old value' });
    var scope = new Scope(() => `${store.Root.Value.firstProperty} ${store.Root.Value.secondProperty}`);
    expect(scope.Value).to.equal('old value second old value');
    
    var setFired = false;
    scope.Watch(() => {
      setFired = true;
    });

    await store.Update({
      firstProperty: 'new value',
      secondProperty: 'second new value'
    });
    
    expect(setFired).to.be.true;
    expect(scope.Value).to.equal('new value second new value');
    
    scope.Destroy();
    store.Destroy();
  });
  it("Basic ID", async () => {
    var store = new StoreSync({}, (val) => val._id);
    var query = store.Query((reader) => {
      var obj = reader.Get<{ _id: string, property: string }>("very-unique-id");
      return obj && obj.property;
    });

    var setFired = false;
    query.Watch(() => {
      setFired = true;
    });

    await store.Action(async (reader, writer) => {
      await writer.Write({ _id: "very-unique-id", property: "property value" });
    });
    expect(setFired).to.equal(true);
    expect(query.Value).to.be.equal("property value");
    store.Destroy();
    query.Destroy();
  });
  it("Overwritten ID", async () => {
    var store = new StoreSync({}, (val) => val._id);
    var query = store.Query((reader) => {
      return reader.Get<{ _id: string, property: string }>("very-unique-id");
    });
    expect(query.Value).to.equal(null);

    await store.Write({ _id: "very-unique-id", property: "first value" });
    expect(query.Value.property).to.equal("first value");

    await store.Write({ _id: "some-collection", collection: [
        { _id: "different-unique-id", property: "different value" },
        { _id: "very-unique-id", property: "new unique value" }
      ]
    });

    expect(query.Value.property).to.be.equal("new unique value");
    query.Destroy();
    store.Destroy();
  });
});

/* import { Store } from "../src/Store/sync/store";
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
}); */