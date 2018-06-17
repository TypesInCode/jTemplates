/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { Observable } from "../src/Observable/observable";
import * as chai from "chai";

const expect = chai.expect;

describe("Observable", () => {
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
        Observable.GetFrom(obs).AddListener("set", () => {
            eventFired = true;
        });
        Observable.GetFrom(obs).Value = "changed";
        expect(obs.valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
    it("set object event firing", () => {
        var obs = Observable.Create({ Prop1: "test" });
        var eventFired = false;
        Observable.GetFrom(obs.Prop1).AddListener("set", () => {
            eventFired = true;
        });
        obs.Prop1 = "changed";
        expect(obs.Prop1.valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
    it("set array event firing", () => {
        var obs = Observable.Create(["test"]);
        var eventFired = false;
        Observable.GetFrom(obs[0]).AddListener("set", () => {
            eventFired = true;
        });
        obs[0] = "changed";
        expect(obs[0].valueOf()).to.equal("changed");
        expect(eventFired).to.be.true;
    });
    it("reset array", () => {
        var obs = Observable.Create(["test1", "test2"]);
        expect(obs.length).to.equal(2);
        Observable.GetFrom(obs).Value = [];
        expect(obs.length).to.equal(0);
    });
    it("basic join", () => {
        var obsVal1 = Observable.Create("obsVal1");
        var obsVal2 = Observable.Create("obsVal2");

        var obs1 = Observable.GetFrom(obsVal1);
        var obs2 = Observable.GetFrom(obsVal2);
        obs1.Join(obs2);

        expect(obs1.Value).to.equal("obsVal2");
        expect(obs2.Value).to.equal("obsVal2");
        expect(obsVal1.toString()).to.equal("obsVal2");
        expect(obsVal2.toString()).to.equal("obsVal2");

        obs1.Value = "new value";

        expect(obs1.Value).to.equal("new value");
        expect(obs2.Value).to.equal("new value");
        expect(obsVal1.toString()).to.equal("new value");
        expect(obsVal2.toString()).to.equal("new value");
    });
    it("object join", () => {
        var obsVal1 = Observable.Create({ prop1: "obsVal1" });
        var obsVal2 = Observable.Create({ prop1: "obsVal2" });

        var obs1 = Observable.GetFrom(obsVal1);
        var obs2 = Observable.GetFrom(obsVal2);
        obs1.Join(obs2);

        expect(obsVal1.prop1.toString()).to.equal("obsVal2");
        expect(obsVal2.prop1.toString()).to.equal("obsVal2");

        obsVal1.prop1 = "new value";

        expect(obsVal1.prop1.toString()).to.equal("new value");
        expect(obsVal2.prop1.toString()).to.equal("new value");
    });
});