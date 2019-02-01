import Emitter from "../emitter";
import { ScopeValueCallback } from "./scopeBase.types";
export declare abstract class ScopeBase<T> extends Emitter {
    private getFunction;
    private emitters;
    private setCallback;
    private destroyCallback;
    private defaultValue;
    private value;
    private dirty;
    private isAsync;
    readonly Value: T;
    protected readonly GetFunction: ScopeValueCallback<T>;
    constructor(getFunction: ScopeValueCallback<T>, defaultValue?: T);
    AsPromise(): Promise<T>;
    Destroy(): void;
    protected abstract UpdateValue(callback: {
        (emitters: Set<Emitter>, value: T): void;
    }): void;
    private UpdateValueBase;
    private UpdateEmitters;
    private SetCallback;
    private DestroyCallback;
    private AddListenersTo;
    private RemoveListenersFrom;
}
