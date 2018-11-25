"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectStore_1 = require("./ObjectStore/objectStore");
var store = new objectStore_1.ObjectStore((obj) => obj._id);
console.log(store.Root);
store.Write(null, () => ({ rootProp: { _id: "unique", name: "TEST" }, secondProp: { _id: "unique", name: "TEST" }, array: [{ _id: "unique", name: "ARRAY" }] }));
var value = null;
var emitters = objectStore_1.ObjectStore.Watch(() => value = store.Root.rootProp.name);
console.log(emitters.length);
console.log(value);
function setCallback() {
    console.log("set called");
}
emitters.forEach(e => e.addListener("set", setCallback));
store.Write(store.Root.rootProp, (val) => {
    val.name = "CHANGED";
    return val;
});
var value = null;
var emitters = objectStore_1.ObjectStore.Watch(() => value = store.Root.secondProp.name);
console.log(emitters.length);
console.log(value);
store.Write(store.Root.secondProp, (val) => {
    val._id = "different";
    val.name = "something else";
    return val;
});
store.Write(store.Root.rootProp, (val) => {
    val._id = "different";
    val.name = "continues to change";
    return val;
});
var value = null;
var emitters = objectStore_1.ObjectStore.Watch(() => value = store.Root.secondProp.name);
console.log(emitters.length);
console.log(value);
var value = null;
var emitters = objectStore_1.ObjectStore.Watch(() => value = store.Root.rootProp.name);
console.log(emitters.length);
console.log(value);
store.Write(store.Root.array, (arr) => {
    arr.push({ _id: "different", name: "changed by array" });
});
console.log(store.Root.rootProp.name);
store.Write(store.Root.rootProp, (val) => {
    val._id = "different";
    val.name = "last test";
    return val;
});
console.log(store.Root.array[1].name);
store.Write(store.Root.array, (val) => {
    val[1] = { _id: "allalone", name: "name allalone" };
    return val;
});
console.log(store.Root.rootProp.name);
store.Write(store.Get("different"), (val) => {
    val.name = "after get is called";
    return val;
});
console.log(store.Root.array[1].name);
store.Write(store.Root.array, (val) => {
    return [{ _id: "different", name: "line 113" }];
});
store.Root = null;
console.log(store.Root);
//# sourceMappingURL=index.debug.js.map