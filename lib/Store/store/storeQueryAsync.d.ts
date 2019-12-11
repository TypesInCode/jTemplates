import { Emitter } from "../../Utils/emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
import { StoreBase } from "./storeBase";
import { StoreQuery } from "./storeQuery";
export declare class StoreQueryAsync<T, O> extends StoreQuery<T, O> {
    private getFunction;
    readonly Promise: Promise<O>;
    constructor(store: StoreBase<T>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
