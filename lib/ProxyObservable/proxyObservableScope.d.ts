import { Emitter } from '../emitter';
export declare class ProxyObservableScope<T> extends Emitter {
    private valueFunction;
    private trackedEmitters;
    private dirty;
    private value;
    private setCallback;
    readonly Value: T;
    readonly Dirty: boolean;
    constructor(valueFunction: {
        (): T;
    });
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
