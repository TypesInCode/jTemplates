import { Store } from "./store/store";
import { DiffAsync } from "./diff/diffAsync";

export class StoreAsync<T> extends Store<T> {
    constructor(init: T, idFunction?: (val: any) => string) {
        super(idFunction, init, new DiffAsync());
    }
}