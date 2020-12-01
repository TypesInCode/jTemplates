/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

// import { ObjectDiff } from "../src/ObjectStore/objectDiff";
/* import * as chai from "chai";
import { List } from "../../src/Utils/list";
const expect = chai.expect;

describe("List", () => {
  it("Create List", () => {
    var list = new List();
    expect(list.Size).to.equal(0);
    expect(list.Head).to.be.null;
    expect(list.Tail).to.be.null;
  });
  it("Add Items", () => {
    var list = new List<string>();
    list.Add("first");
    list.Add("second");
    list.Add("third");
    expect(list.Size).to.equal(3);
  });
  it("Remove Items", () => {
    var list = new List<string>();
    list.Add("first");
    list.Add("second");
    list.Add("third");
    var removed = list.Remove();
    expect(list.Size).to.be.equal(2);
    expect(removed).to.equal("third");
    removed = list.Remove();
    removed = list.Remove();
    expect(list.Size).to.equal(0);
    expect(removed).to.equal("first");
    expect(list.Remove()).to.be.null;
  });
  it("Push Items", () => {
    var list = new List<string>();
    list.Push("first");
    list.Push("second");
    list.Push("third");
    expect(list.Size).to.be.equal(3);
  });
  it("Push -> Remove Items", () => {
    var list = new List<string>();
    list.Push("first");
    list.Push("second");
    list.Push("third");
    var removed = list.Remove();
    expect(list.Size).to.be.equal(2);
    expect(removed).to.equal("first");
  });
  it("Push -> Pop Items", () => {
    var list = new List<string>();
    list.Push("first");
    list.Push("second");
    list.Push("third");
    var removed = list.Pop();
    expect(list.Size).to.be.equal(2);
    expect(removed).to.equal("third");
  });
  it("ForEach", () => {
    var list = new List<string>();
    list.Push("first");
    list.Push("second");
    list.Push("third");

    var count = 0;
    list.ForEach((value) => {
        count++;
    });
    expect(count).to.equal(3);
  });
}); */