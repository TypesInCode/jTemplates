import { ScopeBase } from "../scope/scopeBase";
import { Emitter } from "../../emitter";
import { Scope } from "../scope/scope";
import { AsyncFuncCallback } from "./store.types";
import { Store } from "./store";

export class StoreQuery<T, O> extends ScopeBase<O> {

    private store: Store<any>;

    constructor(store: Store<any>, defaultValue: O, getFunction: AsyncFuncCallback<T, O>) {
        super(getFunction, defaultValue);
        this.store = store;
    }

    public Scope<R>(callback: {(parent: O): R}): Scope<R> {
        return new Scope<R>(() => callback(this.Value));
    }

    public Destroy() {
        super.Destroy();
        // this.reader.Destroy();
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: O) => void): void {
        var value: any = null;
        var emitters: any = null;
        this.store.Action(async (reader, writer) => {
            reader.Watching = true;
            value = await (this.GetFunction  as AsyncFuncCallback<T, O>)(reader, writer);
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