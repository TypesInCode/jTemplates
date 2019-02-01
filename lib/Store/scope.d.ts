import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
import { ScopeValueCallback } from "./scopeBase.types";
export declare class Scope<T, C extends ScopeValueCallback<T>> extends ScopeBase<T, C> {
    constructor(getFunction: C);
    Scope<O, C1 extends ScopeValueCallback<O>>(callback: {
        (parent: T): O;
    }): Scope<O, C1>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
