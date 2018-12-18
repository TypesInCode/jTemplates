import { ScopeBase } from "./scopeBase";
import { Emitter } from "../emitter";
export declare class Scope<T> extends ScopeBase<T> {
    constructor(getFunction: {
        (): T;
    });
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
