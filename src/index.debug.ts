import { Store } from "./Store";

async function Test() {
    var store = new Store({ first: "test", second: "test" });
      
    store.Action((root, writer) => {
        writer.Write(root, { first: "changed", second: "changed" });
    });

    console.log(store.Root.Value.first);
}

Test();