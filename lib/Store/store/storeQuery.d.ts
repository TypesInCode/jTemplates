import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
import { Store } from "./store";
export declare class StoreQuery<T, O> extends ScopeBase<O> {
    private store;
    readonly Promise: Promise<O>;
    constructor(store: Store<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R>;
    Destroy(): void;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void;
}
