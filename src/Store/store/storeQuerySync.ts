import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../Utils/emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback, FuncCallback } from "./store.types";
import { StoreBase } from "./storeBase";
import { StoreQuery } from "./storeQuery";

export class StoreQuerySync<T, O> extends StoreQuery<T, O> {
    private getFunction: FuncCallback<T, O>;

    constructor(store: StoreBase<any>, defaultValue: O, getFunction: FuncCallback<T, O>) {
        super(store, defaultValue);
        this.getFunction = getFunction;
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void {
        var value: any = null;
        var emitters: Set<Emitter> = null;
        this.Store.ActionSync(reader => {
            reader.Watching = true;
            value = this.getFunction(reader);
            reader.Watching = false;
            emitters = reader.Emitters;
        });
        callback(emitters, value);
    }
    
}