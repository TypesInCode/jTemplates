import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { Store } from "./store";
import { StoreReader } from "./storeReader";
import { Scope } from "../scope";

export class StoreQuery<T> extends ScopeBase<T> {

    constructor(private store: Store<any>, getFunction: {(reader: StoreReader<any>): T}) {
        super(getFunction, null);
    }

    public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var reader = this.store.GetReader();
        var value = this.GetNewValue(reader) as T;
        callback(reader.Emitters, value);
    }
    
}