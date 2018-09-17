"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxyObservable_1 = require("./ProxyObservable/proxyObservable");
var obs = proxyObservable_1.ProxyObservable.Create({ first: { child: "val1" } });
var val = null;
var emitters = proxyObservable_1.ProxyObservable.Watch(() => val = obs.first.child);
console.log(val);
console.log(emitters.length);
var setFired = false;
emitters[1].addListener("set", () => {
    setFired = true;
});
obs.first.child = "val2";
console.log(setFired);
//# sourceMappingURL=index.debug.js.map