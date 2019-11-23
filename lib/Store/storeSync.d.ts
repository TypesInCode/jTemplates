import { StoreBase } from "./store/storeBase";
export declare class StoreSync<T> extends StoreBase<T> {
    constructor(init: T, idFunction?: (val: any) => string);
}
