/* import { StoreManager } from "./Store/sync/storeManager";
import { StoreAsync } from "./Store/async/storeAsync";
import { Store } from "./Store/sync/store";

/* var store = Store.Create({ temp: "test", temp2: "test2" });
var query = store.Query("temp", reader => reader.Root.temp);
console.log(query.Value); */

/* var store = Store.Create({ temp: "test", temp2: "test2" });
var query = store.Query("test", store => store.Root);
var scope = query.Scope(parent => parent.temp);

console.log(scope.Value);
store.Action(reader => {
    reader.Root.temp = "different";
});
console.log(scope.Value);
store.Destroy(); */

/* var store = Store.Create(["first", "second"]);
var query = store.Query("root", store => store.Root);
var scope = query.Scope(parent => parent.filter(v => v === "first"));

console.log(scope.Value.length);
store.Action((reader, writer) => {
    // writer.Push(reader.Root, "first");
    writer.Splice(reader.Root, 1);
});
console.log(scope.Value.length);
store.Destroy(); */
