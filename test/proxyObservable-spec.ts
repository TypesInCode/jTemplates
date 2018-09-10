/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { ProxyObservable } from '../src/ProxyObservable/proxyObservable';
import * as chai from "chai";

const expect = chai.expect;

describe("ProxyObservable", () => {
    it("simple object", () => {
        var obs = ProxyObservable.Create({ first: "val1" });
        var val = null;
        var emitters = ProxyObservable.Watch(() => val = obs.first);
        expect(val).to.equal("val1");
        expect(emitters.length).to.equal(1);

        var setFired = false;
        emitters[0].addListener("set", () => {
            setFired = true;
        });

        obs.first = "val2";
        expect(setFired).to.be.true;
    });
    it("complex object", () => {
        var obs = ProxyObservable.Create({ first: { child: "val1" } });
        var val = null;
        var emitters = ProxyObservable.Watch(() => val = obs.first.child);

        expect(val).to.equal("val1");
        expect(emitters.length).to.equal(2);

        var setFired = false;
        emitters[1].addListener("set", () => {
            setFired = true;
        });

        obs.first.child = "val2";
        expect(setFired).to.be.true;
    });
    it("simple array", () => {
        var obs = ProxyObservable.Create([]);
        var val = null;
        var emitters = ProxyObservable.Watch(() => val = obs.length);

        expect(val).to.equal(0);
        expect(emitters.length).to.equal(1);

        var setFired = false;
        emitters[0].addListener("set", () => {
            setFired = true;
        });

        obs[0] = "test";
        expect(setFired).to.be.true;
        expect(obs[0]).to.equal("test");
    });
    it("setting observable with another observable", () => {
        var obs1 = ProxyObservable.Create({ first: { child: "val1" } });
        var obs2 = ProxyObservable.Create({ child: "val2" });

        obs1.first = obs2;
        expect(obs1.first.child).to.equal("val2");
    });
});