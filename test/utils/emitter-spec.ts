/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

// import { ObjectDiff } from "../src/ObjectStore/objectDiff";
import * as chai from "chai";
const expect = chai.expect;
import { Emitter } from "../../src/Utils/emitter";

describe("Emitter", () => {
  it("Basic Emitter", () => {
    var emitter = new Emitter();
    var fired = false;
    emitter.addListener("event", () => {
        fired = true;
    });
    emitter.emit("event");
    expect(fired).to.be.true;
  });
  it("Emitter with parameters", () => {
    var emitter = new Emitter();
    var parameter = null;
    emitter.addListener("event", (param) => {
        parameter = param;
    });
    emitter.emit("event", "param");
    expect(parameter).to.equal("param");
  });
  it("Multiple listeners", () => {
    var emitter = new Emitter();
    var fired1 = false;
    var fired2 = false;

    emitter.addListener("event", () => {
        fired1 = true;
    });
    emitter.addListener("event", () => {
        fired2 = true;
    });
    emitter.emit("event");

    expect(fired1 && fired2).to.be.true;
  });
  it("Multiple types", () => {
    var emitter = new Emitter();
    var type1 = false;
    var type2 = false;

    emitter.addListener("event1", () => {
        type1 = true;
    });
    emitter.addListener("event2", () => {
        type2 = true;
    });
    emitter.emit("event1");

    expect(type1 && !type2).to.be.true;
  });
});