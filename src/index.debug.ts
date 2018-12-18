import { Store } from "./Store/sync/store";
import { StoreAsync } from "./Store/async/storeAsync";

StoreAsync.Create({ temp: "test", temp2: "test2" }).then(store => {
    var query = store.Query("", async reader => reader.Root.temp);
    console.log(query.Value);
    query.addListener("set", () => {
        console.log(query.Value)
    });
});