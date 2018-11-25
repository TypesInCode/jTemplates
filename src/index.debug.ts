import { ObjectStore } from "./ObjectStore/objectStore";
import { ObjectStoreScope } from "./ObjectStore/ObjectStoreScope";


/* var store = ObjectStore.Create(["first", "second"]);

var scope = new ObjectStoreScope(() => store.Root.length)
console.log(scope.Value);

store.Root = ["first", "second", "third"];

console.log(scope.Value);

store.Root = ["first"];

console.log(scope.Value); */

interface IType {
    rootProp: {
        _id: string;
        name: string;
    };

    secondProp: {
        _id: string;
        name: string;
    }

    array: Array<{ _id: string, name: string }>;
}

var store = new ObjectStore<IType>((obj: any) => obj._id);

console.log(store.Root);
store.Write<IType>(null, () => ({ rootProp: { _id: "unique", name: "TEST" }, secondProp: { _id: "unique", name: "TEST" }, array: [{ _id: "unique", name: "ARRAY"}] }));

var value = null;
var emitters = ObjectStore.Watch(() => value = store.Root.rootProp.name);

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
var emitters = ObjectStore.Watch(() => value = store.Root.secondProp.name);

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
var emitters = ObjectStore.Watch(() => value = store.Root.secondProp.name);

console.log(emitters.length);
console.log(value);

var value = null;
var emitters = ObjectStore.Watch(() => value = store.Root.rootProp.name);

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

store.Write(store.Get<{ _id: string, name: string }>("different"), (val) => {
    val.name = "after get is called";
    return val;
});

console.log(store.Root.array[1].name);

store.Write(store.Root.array, (val) => {
    return [{ _id: "different", name: "line 113" }];
});

store.Root = null;

console.log(store.Root);