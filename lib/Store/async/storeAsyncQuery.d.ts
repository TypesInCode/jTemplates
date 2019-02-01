import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreAsyncManager } from "./storeAsyncManager";
import { Scope } from "../scope";
import { AsyncFuncCallback } from "./storeAsync.types";
import { FuncCallback } from "../sync/store.types";
export declare class StoreAsyncQuery<T, O> extends ScopeBase<O, AsyncFuncCallback<T, O>> {
    private reader;
    private writer;
    constructor(store: StoreAsyncManager<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R, FuncCallback<T, R>>;
    Destroy(): void;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
