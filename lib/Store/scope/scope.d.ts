import Emitter from "../../Utils/emitter";
export declare class Scope<T> extends Emitter {
    private getFunction;
    private emitters;
    private setCallback;
    private value;
    private dirty;
    readonly Value: T;
    readonly HasValue: boolean;
    constructor(getFunction: {
        (): T;
    } | T);
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    Watch(callback: {
        (value: T): void;
    }): void;
    Destroy(): void;
    private UpdateEmitters;
    private SetCallback;
    private AddListenersTo;
    private RemoveListenersFrom;
}
