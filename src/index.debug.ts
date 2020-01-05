import { StoreSync, Scope } from "./Store";

async function Test() {
    var store = new StoreSync({ first: "test", second: "test" });
      
    await store.Action(async (reader, writer) => {
      await writer.Update(reader.Root, { first: "changed", second: "changed" });
    });

    console.log(store.Root.Value.first);
}

Test();