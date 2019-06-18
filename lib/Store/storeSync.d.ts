import { Store } from "./store/store";
export declare class StoreSync<T> extends Store<T> {
    constructor(idFunction: (val: any) => string, init: T);
}
