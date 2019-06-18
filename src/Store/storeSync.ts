import { Store } from "./store/store";
import { DiffSync } from "./diff/diffSync";

export class StoreSync<T> extends Store<T> {
    constructor(idFunction: (val: any) => string, init: T) {
        super(idFunction, init, new DiffSync());
    }
}