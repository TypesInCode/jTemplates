import { Emitter } from '../emitter';
export declare class ObjectStoreScope<T> extends Emitter {
    private valueFunction;
    private trackedEmitters;
    private dirty;
    private value;
    private setCallback;
    readonly Value: T;
    constructor(valueFunction: {
        (): T;
    });
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
