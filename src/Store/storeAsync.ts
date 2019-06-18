import { Store } from "./store/store";
import { DiffAsync } from "./diff/diffAsync";

export class StoreAsync<T> extends Store<T> {
    constructor(idFunction: (val: any) => string, init: T) {
        super(idFunction, init, new DiffAsync());
    }
}