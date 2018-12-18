/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { StoreAsync } from "../src/Store/async/storeAsync";
import * as chai from "chai";
const expect = chai.expect;

describe("Store (Async)", () => {
  it("Basic Test", (done) => {
    StoreAsync.Create({ temp: "test", temp2: "test2" }).then(store => {
      var query = store.Query("", async reader => reader.Root.temp);
      expect(query.Value).to.equal("");
      query.addListener("set", () => {
          expect(query.Value).to.equal("test");
          done();
      });
    });
  });
  it("Update", () => {
    /* var store = Store.Create({ temp: "test", temp2: "test2" });
    var tempQuery = store.Query(reader => reader.Root.temp);
    expect(tempQuery.Value).to.equal("test");

    var rootQuery = store.Query(reader => reader.Root);
    var eventFired = false;
    tempQuery.addListener("set", () => eventFired = true);
    rootQuery.Value.temp = "different";
    expect(tempQuery.Value).to.equal("different");
    expect(eventFired).to.be.true; */
  });
});