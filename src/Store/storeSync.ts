import { StoreBase } from "./store/storeBase";
import { DiffSync } from "./diff/diffSync";

export class StoreSync<T> extends StoreBase<T> {
    constructor(init: T, idFunction?: (val: any) => string) {
        super(idFunction, init, new DiffSync());
    }
}