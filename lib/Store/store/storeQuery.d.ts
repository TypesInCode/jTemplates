import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../emitter";
import { StoreManager } from "./storeManager";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
export declare class StoreQuery<T, O> extends ScopeBase<O> {
    private reader;
    private writer;
    constructor(store: StoreManager<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R>;
    Destroy(): void;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
