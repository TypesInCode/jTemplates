/// <reference path="../node_modules/@types/mocha/index.d.ts" />

/* import { StoreAsync } from "../src/Store/async/storeAsync";
import * as chai from "chai";
const expect = chai.expect;

describe("Store (Async)", () => {
  it("Basic Test", (done) => {
    var store = StoreAsync.Create({ temp: "test", temp2: "test2" });
    var query = store.Query("", "", async reader => reader.Root.temp);
    expect(query.Value).to.equal("");

    store.OnComplete.then(store => {
        expect(query.Value).to.equal("test");
        done();
    });
  });
}); */