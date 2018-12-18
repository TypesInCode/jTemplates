import { ScopeBase } from "../scopeBase";
import { Emitter } from "../../emitter";
import { StoreAsync } from "./storeAsync";
import { StoreAsyncReader } from "./storeAsyncReader";
import { Scope } from "../scope";

export class StoreAsyncQuery<T> extends ScopeBase<T> {

    constructor(private store: StoreAsync<any>, getFunction: {(reader: StoreAsyncReader<any>): Promise<T>}, defaultValue: any) {
        super(getFunction, defaultValue);
    }

    public Scope<O>(callback: {(parent: T): O}): ScopeBase<O> {
        return new Scope(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var reader = this.store.GetReader();
        (this.GetNewValue(reader) as Promise<T>).then(value => {
            callback(reader.Emitters, value);
        });
    }
    
}