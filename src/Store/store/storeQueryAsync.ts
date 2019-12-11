import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../Utils/emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
import { StoreBase } from "./storeBase";
import { StoreQuery } from "./storeQuery";

export class StoreQueryAsync<T, O> extends StoreQuery<T, O> {
    private getFunction: AsyncFuncCallback<T, O>;

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

    constructor(store: StoreBase<T>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>) {
        super(store, defaultValue);
        this.getFunction = getFunction;
    }

    public Scope<R>(callback: {(parent: O): R}): Scope<R> {
        return new Scope<R>(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void {
        var value: any = null;
        var emitters: any = null;
        this.Store.Action(async (reader, writer) => {
            reader.Watching = true;
            value = await this.getFunction(reader, writer);
            reader.Watching = false;
            emitters = reader.Emitters;
        }).then(() => callback(emitters, value as O));
        
        /* this.reader.Watching = true;
        (this.GetFunction  as AsyncFuncCallback<T, O>)(this.reader, this.writer).then(value => {
            this.reader.Watching = false;
            callback(this.reader.Emitters, value as O);
        }); */
    }
    
}