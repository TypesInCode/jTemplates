import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { Store } from "./store";
import { StoreReader } from "./storeReader";
export declare class StoreQuery<T> extends ScopeBase<T> {
    private store;
    constructor(store: Store<any>, getFunction: {
        (reader: StoreReader<any>): T;
    });
    Scope<O>(callback: {
        (parent: T): O;
    }): ScopeBase<O>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
