import { StoreSync, Scope } from "./Store";

async function Test() {
    var store = new StoreSync({}, (val) => val._id);
    var query = store.Query((reader) => {
      var obj = reader.Get<{ _id: string, property: string }>("very-unique-id");
      return obj && obj.property;
    });

    var setFired = false;
    query.Watch((val) => {
      setFired = true;
    });

    await store.Action(async (reader, writer) => {
      await writer.Write({ _id: "very-unique-id", property: "property value" });
    });
    console.log(setFired)
    console.log(query.Value);
    store.Destroy();
    query.Destroy();
}

Test();