import { ScopeBase } from "./scopeBase";
import { Emitter } from "../../Utils/emitter";
export declare class Scope<T> extends ScopeBase<T> {
    private getFunction;
    constructor(getFunction: {
        (): T;
    } | T);
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    protected UpdateValue(callback: (emitters: Set<Emitter>, value: T) => void): void;
}
