import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
import { scopeCollector } from "./scopeCollector";
import { ScopeValueCallback } from "./scopeBase.types";

export class Scope<T> extends ScopeBase<T> {

    constructor(getFunction: ScopeValueCallback<T>) {
        super(getFunction, null);
    }

    public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope<O>(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var value = null;
        var emitters = scopeCollector.Watch(() => {
            value = this.GetFunction();
        });
        callback(emitters, value as T);
    }
    
}