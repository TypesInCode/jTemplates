import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
import { scopeCollector } from "./scopeCollector";
import { ScopeValueCallback } from "./scopeBase.types";

export class Scope<T, C extends ScopeValueCallback<T>> extends ScopeBase<T, C> {

    constructor(getFunction: C) {
        super(getFunction, null);
    }

    public Scope<O, C1 extends ScopeValueCallback<O>>(callback: {(parent: T): O}): Scope<O, C1> {
        return new Scope<O, any>(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var value = null;
        var emitters = scopeCollector.Watch(() => {
            value = this.GetFunction();
        });
        callback(emitters, value as T);
    }
    
}