import Emitter from "../../Utils/emitter";
export declare abstract class ScopeBase<T> extends Emitter {
    private emitters;
    private setCallback;
    private destroyCallback;
    private isStatic;
    private defaultValue;
    private value;
    private dirty;
    private isAsync;
    readonly Value: T;
    readonly HasValue: boolean;
    constructor(defaultValue?: T);
    Destroy(): void;
    protected abstract UpdateValue(callback: {
        (emitters: Set<Emitter>, value: T): void;
    }): void;
    protected UpdateValueBase(): void;
    private UpdateEmitters;
    private SetCallback;
    private DestroyCallback;
    private AddListenersTo;
    private RemoveListenersFrom;
}
