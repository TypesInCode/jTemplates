import { StoreAsync } from ".";

var store = StoreAsync.Create([{ id: "first", value: "this and that" }], (val) => val.id);

var scope = store.Scope(root => root && root.length);

scope.addListener("set", () => {
    console.log("In scope set");
    console.log(scope.Value);
})

console.log(scope.Value);
console.log(store.Root[0].value);

store.Write(store.Root, (val) => {
    val.push({
        id: "second",
        value: "second value"
    });
});

store.Write(store.Root, (val) => {
    val.push({
        id: "second",
        value: "third value"
    });
})

console.log(scope.Value);

store.Write(store.Root, () => null);

/* store.Write(store.Root, () => {
    return null;
}); */
