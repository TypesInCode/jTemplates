/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import Observable from "../src/Observable/observable";
import * as chai from "chai";

const expect = chai.expect;

describe("JsonTreeNode", () => {
    it("string value", () => {
        var obs = Observable.Create("test");
        expect(obs.valueOf()).to.equal("test");
    });
    it("object value", () => {
        var obs = Observable.Create({ Prop1: "test" });
        expect(obs.Prop1.valueOf()).to.equal("test");
    });
    it("array value", () => {
        var obs = Observable.Create(["test"]);
        var value = obs.valueOf() as Array<any>;
        expect(value.length).to.equal(1);
        expect(value[0].valueOf()).to.equal("test");
    });
    it("set event firing string", () => {
        var obs = Observable.Create("test");
        var eventFired = false;
        obs.AddListener("set", () => {
            eventFired = true;
        });
        obs.SetValue("changed");
        expect(obs.valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
    it("set object event firing", () => {
        var obs = Observable.Create({ Prop1: "test" });
        var eventFired = false;
        (obs.Prop1 as any as Observable).AddListener("set", () => {
            eventFired = true;
        });
        obs.Prop1 = "changed";
        expect(obs.Prop1.valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
    it("set array event firing", () => {
        var obs = Observable.Create(["test"]);
        var eventFired = false;
        (obs[0] as any as Observable).AddListener("set", () => {
            eventFired = true;
        });
        obs[0] = "changed";
        expect(obs[0].valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
});