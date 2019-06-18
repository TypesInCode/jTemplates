import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../emitter";
import { StoreManager } from "./storeManager";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";

export class StoreQuery<T, O> extends ScopeBase<O> {

    private reader: StoreReader<T>;
    private writer: StoreWriter<T>;

    constructor(store: StoreManager<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>) {
        super(getFunction, defaultValue);
        this.reader = new StoreReader(store);
        this.writer = new StoreWriter(store);
    }

    public Scope<R>(callback: {(parent: O): R}): Scope<R> {
        return new Scope<R>(() => callback(this.Value));
    }

    public Destroy() {
        super.Destroy();
        this.reader.Destroy();
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void {
        this.reader.Watching = true;
        (this.GetFunction  as AsyncFuncCallback<T, O>)(this.reader, this.writer).then(value => {
            this.reader.Watching = false;
            callback(this.reader.Emitters, value as O);
        });
    }
    
}