/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { Observable } from "../src/Observable/observable";
import ObservableScope from "../src/Observable/observableScope";
import * as chai from "chai";

const expect = chai.expect;

describe("Observable Scope", () => {
    it("string value", () => {
        var obs = Observable.Create("test");
        var scope = new ObservableScope(() => obs);
        expect(scope.Value).to.equal("test");
    });
    it("string statement", () => {
        var obs = Observable.Create("test");
        var scope = new ObservableScope(() => `${obs} value`);
        expect(scope.Value).to.equal("test value");
    });
    it("string statement changed", () => {
        var obs = Observable.Create("test");
        var scope = new ObservableScope(() => `${obs} value`);
        var eventFired = false;
        scope.AddListener("set", () => {
            eventFired = true;
        });
        Observable.GetFrom(obs).Value = "new";
        expect(scope.Value).to.equal("new value");
        expect(eventFired).to.be.true;
    });
    it("array check", () => {
        var obs = Observable.Create(["first", "second"]);
        var scope = new ObservableScope(() => obs.length);
        var eventFired = false;
        scope.AddListener("set", () => {
            eventFired = true;
        });
        obs.push("third");
        expect(scope.Value).to.equal(3);
        expect(eventFired).to.be.true;
    });
});