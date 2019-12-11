import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../Utils/emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
import { StoreBase } from "./storeBase";

export abstract class StoreQuery<T, O> extends ScopeBase<O> {
    private store: StoreBase<T>;

    protected get Store() {
        return this.store;
    }

    public get Promise(): Promise<O> {
        return new Promise((resolve, reject) => {
            if(this.HasValue)
                resolve(this.Value);
            else {
                var listener = () => {
                    resolve(this.Value);
                    this.removeListener("set", listener);
                }
                this.addListener("set", listener);
                this.UpdateValueBase();
            }
        });
    }

    constructor(store: StoreBase<T>, defaultValue: O) {
        super(defaultValue);
        this.store = store;
    }

    public Scope<R>(callback: {(parent: O): R}): Scope<R> {
        return new Scope<R>(() => callback(this.Value));
    }
    
}