/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { ProxyObservable } from '../src/ProxyObservable/proxyObservable';
import { ProxyObservableScope } from '../src/ProxyObservable/proxyObservableScope';
import * as chai from "chai";

const expect = chai.expect;

describe("ProxyObservableScope", () => {
    it("simple scope", () => {
        var obs = ProxyObservable.Create({ first: "val1" });
        var scope = new ProxyObservableScope(() => obs.first);
        var setFired = false;
        scope.addListener("set", () => {
            setFired = true;
        });

        expect(scope.Value).to.equal("val1");
        obs.first = "val2";
        expect(setFired).to.be.true;
        expect(scope.Value).to.equal("val2");
    });
    it("filtered array", () => {
        var obs = ProxyObservable.Create([1, 2, 3, 4]);
        var scope = new ProxyObservableScope(() => obs.filter(v => v%2 === 0));
        expect(scope.Value.length).to.equal(2);

        var setFired = false;
        scope.addListener("set", () => {
            setFired = true;
        });

        obs.push(5, 6);
        expect(setFired).to.be.true;
        expect(scope.Value.length).to.equal(3);
        obs[0] = 8;
        expect(scope.Value.length).to.equal(4);
    });
});