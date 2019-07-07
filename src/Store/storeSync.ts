import { Store } from "./store/store";
import { DiffSync } from "./diff/diffSync";

export class StoreSync<T> extends Store<T> {
    constructor(init: T, idFunction?: (val: any) => string) {
        super(idFunction, init, new DiffSync());
    }
}