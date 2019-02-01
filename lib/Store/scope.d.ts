import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
import { ScopeValueCallback } from "./scopeBase.types";
export declare class Scope<T> extends ScopeBase<T> {
    constructor(getFunction: ScopeValueCallback<T>);
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
