import { ObjectDiff } from "./ObjectStore/objectDiff";

var resp = ObjectDiff("root", { id: "first", value: "second", other: { child: "value" } }, { id: "first", value: "second", other: { child: "value" } }, (val: any) => val.id);
console.log(resp);

/* store.Write(store.Root, () => {
    return null;
}); */
