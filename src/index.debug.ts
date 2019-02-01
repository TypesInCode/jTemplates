import { StoreManager } from "./Store/sync/storeManager";
import { StoreAsync } from "./Store/async/storeAsync";
import { Store } from "./Store/sync/store";

var store = StoreAsync.Create({ temp: "test", temp2: "test2" });
var query = store.Query("", "", async reader => reader.Root.temp);
console.log(query.Value);

store.OnComplete.then(() => {
    console.log(query.Value);
});
