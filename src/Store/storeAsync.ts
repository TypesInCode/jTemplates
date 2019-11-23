import { StoreBase } from "./store/storeBase";
import { DiffAsync } from "./diff/diffAsync";

export class StoreAsync<T> extends StoreBase<T> {
    constructor(init: T, idFunction?: (val: any) => string) {
        super(idFunction, init, new DiffAsync());
    }
}