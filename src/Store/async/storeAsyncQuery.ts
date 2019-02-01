import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreAsyncManager } from "./storeAsyncManager";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { Scope } from "../scope";
import { AsyncFuncCallback } from "./storeAsync.types";
import { FuncCallback } from "../sync/store.types";

export class StoreAsyncQuery<T, O> extends ScopeBase<O, AsyncFuncCallback<T, O>> {

    private reader: StoreAsyncReader<T>;
    private writer: StoreAsyncWriter<T>;

    constructor(store: StoreAsyncManager<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>) {
        super(getFunction, defaultValue);
        this.reader = new StoreAsyncReader(store);
        this.writer = new StoreAsyncWriter(store);
    }

    public Scope<R>(callback: {(parent: O): R}): Scope<R, FuncCallback<T, R>> {
        return new Scope<R, FuncCallback<T, R>>(() => callback(this.Value));
    }

    public Destroy() {
        super.Destroy();
        this.reader.Destroy();
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void {
        this.reader.Watching = true;
        this.GetFunction(this.reader, this.writer).then(value => {
            this.reader.Watching = false;
            callback(this.reader.Emitters, value as O);
        });
    }
    
}