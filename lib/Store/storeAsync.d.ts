import { Store } from "./store/store";
export declare class StoreAsync<T> extends Store<T> {
    constructor(idFunction: (val: any) => string, init: T);
}
