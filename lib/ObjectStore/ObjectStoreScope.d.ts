import { Emitter } from '../emitter';
export declare class Scope<T> extends Emitter {
    private valueFunction;
    private trackedEmitters;
    private dirty;
    private value;
    private setCallback;
    readonly Value: T;
    constructor(valueFunction: {
        (): T;
    });
    Scope<O>(valueFunction: {
        (val: T): O;
    }): Scope<O>;
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
