import { Emitter } from "../../Utils/emitter";
import { FuncCallback } from "./store.types";
import { StoreBase } from "./storeBase";
import { StoreQuery } from "./storeQuery";
export declare class StoreQuerySync<T, O> extends StoreQuery<T, O> {
    private getFunction;
    constructor(store: StoreBase<any>, defaultValue: O, getFunction: FuncCallback<T, O>);
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
