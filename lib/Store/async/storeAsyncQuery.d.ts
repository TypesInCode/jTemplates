import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreAsync } from "./storeAsync";
import { StoreAsyncReader } from "./storeAsyncReader";
import { Scope } from "../scope";
export declare class StoreAsyncQuery<T> extends ScopeBase<T> {
    private store;
    constructor(store: StoreAsync<any>, getFunction: {
        (reader: StoreAsyncReader<any>): Promise<T>;
    }, defaultValue: any);
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
