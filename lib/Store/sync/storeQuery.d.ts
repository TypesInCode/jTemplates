import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreManager } from "./storeManager";
import { Scope } from "../scope";
import { FuncCallback } from "./store.types";
export declare class StoreQuery<T, O> extends ScopeBase<O, FuncCallback<T, O>> {
    private reader;
    private writer;
    constructor(store: StoreManager<any>, getFunction: FuncCallback<T, O>);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R, FuncCallback<T, R>>;
    Destroy(): void;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
