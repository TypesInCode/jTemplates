import { ProxyObservable } from "./ProxyObservable/proxyObservable";
import { ProxyObservableScope } from "./ProxyObservable/proxyObservableScope";

var obs = ProxyObservable.Create({ arr: [4,3,2,1] });
var scope = new ProxyObservableScope(() => obs.arr[0]);
var scope2 = new ProxyObservableScope(() => obs.arr.length);
var scope3 = new ProxyObservableScope(() => obs.arr);

console.log(scope.Value);

var setFired = false;
scope.addListener("set", () => {
    setFired = true;
});

var setFired2 = false;
scope2.addListener("set", () => {
    setFired2 = true;
});

var setFired3 = false;
scope3.addListener("set", () => {
    setFired3 = true;
});

obs.arr.push(0);

console.log(scope.Value);
console.log(scope2.Value);
console.log(scope3.Value);
console.log(setFired);
console.log(setFired2);
console.log(setFired3);