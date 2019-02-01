import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreManager } from "./storeManager";
import { StoreReader } from "./storeReader";
import { Scope } from "../scope";
import { FuncCallback } from "./store.types";
import { StoreWriter } from "./storeWriter";

export class StoreQuery<T, O> extends ScopeBase<O, FuncCallback<T, O>> {

    private reader: StoreReader<T>;
    private writer: StoreWriter<T>;

    constructor(store: StoreManager<any>, getFunction: FuncCallback<T, O>) {
        super(getFunction, null);
        this.reader = new StoreReader(store);
        this.writer = new StoreWriter(store);
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
        var value = this.GetFunction(this.reader, this.writer);
        this.reader.Watching = false;

        callback(this.reader.Emitters, value as O);
    }
    
}