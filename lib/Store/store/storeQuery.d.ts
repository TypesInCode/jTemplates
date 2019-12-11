import { ScopeBase } from "../scope/scopeBase";
import { Scope } from "../scope/scope";
import { StoreBase } from "./storeBase";
export declare abstract class StoreQuery<T, O> extends ScopeBase<O> {
    private store;
    protected readonly Store: StoreBase<T>;
    readonly Promise: Promise<O>;
    constructor(store: StoreBase<T>, defaultValue: O);
    Scope<R>(callback: {
        (parent: O): R;
    }): Scope<R>;
}
