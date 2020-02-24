/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

import { StoreSync } from "../../src/Store";
import * as chai from "chai";
const expect = chai.expect;

describe("StoreWriter (Sync)", () => {
  it("Update", async() => {
    var store = new StoreSync({ first: "test", second: "test" });
    
    await store.Action(async (reader, writer) => {
      await writer.Update(reader.Root, { first: "changed", second: "changed" });
    });

    expect(store.Root.Value.first).to.equal("changed");
    expect(store.Root.Value.second).to.equal("changed");
  });
  it("Merge", async() => {
    var store = new StoreSync({ first: "test", second: "test" });
    
    await store.Action(async (reader, writer) => {
      await writer.Merge(reader.Root, { first: "changed" });
    });

    expect(store.Root.Value.first).to.equal("changed");
    expect(store.Root.Value.second).to.equal("test");
  });
  it("Push", async () => {
    var store = new StoreSync(["first", "second", "third"]);
    expect(store.Root.Value.length).to.equal(3);
    
    await store.Action(async (reader, writer) => {
      await writer.Push(reader.Root, "fourth");
    });

    expect(store.Root.Value.length).to.equal(4);
    expect(store.Root.Value[3]).to.equal("fourth");
  });
  it("Splice", async () => {
    var store = new StoreSync(["first", "second", "third"]);
    expect(store.Root.Value.length).to.equal(3);
    
    await store.Action(async (reader, writer) => {
      await writer.Splice(reader.Root, 1, 1);
    });

    expect(store.Root.Value.length).to.equal(2);
    expect(store.Root.Value[1]).to.equal("third");
  });
});