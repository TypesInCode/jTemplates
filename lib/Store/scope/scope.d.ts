export declare class Scope<T> {
    private getFunction;
    private emitter;
    private emitters;
    private setCallback;
    private value;
    private dirty;
    readonly Value: T;
    constructor(getFunction: {
        (): T;
    } | T);
    Scope<O>(callback: {
        (parent: T): O;
    }): Scope<O>;
    Watch(callback: {
        (scope?: Scope<T>): void;
    }): void;
    Destroy(): void;
    private UpdateValue;
    private UpdateEmitters;
    private SetCallback;
    private AddListenersTo;
    private RemoveListenersFrom;
}
