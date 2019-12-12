import { ScopeBase } from "./scopeBase";
import { Emitter } from "../../Utils/emitter";
import { ScopeCollector } from "./scopeCollector";

export class Scope<T> extends ScopeBase<T> {
    private getFunction: {(): T};

    constructor(getFunction: {(): T} | T) {
        if(typeof getFunction !== 'function')
            super(getFunction);
        else {
            super(null);
            this.getFunction = getFunction as {(): T};
        }

    }

    public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope<O>(() => callback(this.Value));
    }
    
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void {
        var value = undefined;
        var emitters = ScopeCollector.Watch(() => {
            if(this.getFunction)
                value = this.getFunction();
        });
        callback(emitters, value as T);
    }
    
}