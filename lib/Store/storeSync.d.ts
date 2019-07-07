import { Store } from "./store/store";
export declare class StoreSync<T> extends Store<T> {
    constructor(init: T, idFunction?: (val: any) => string);
}
