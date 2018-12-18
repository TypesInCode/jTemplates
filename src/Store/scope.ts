import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
import { scopeCollector } from "./scopeCollector";

export class Scope<T> extends ScopeBase<T> {

    constructor(getFunction: {(): T}) {
        super(getFunction, null);
    }

    public Scope<O>(callback: {(parent: T): O}): ScopeBase<O> {
        return new Scope(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var value = null;
        var emitters = scopeCollector.Watch(() => {
            value = this.GetNewValue();
        });
        callback(emitters, value as T);
    }
    
}