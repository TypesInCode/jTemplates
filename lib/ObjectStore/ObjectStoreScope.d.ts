import { Emitter } from '../emitter';
export declare class Scope<T> extends Emitter {
    private getFunction;
    private trackedEmitters;
    private valuePromise;
    private setCallback;
    readonly Value: Promise<T>;
    constructor(getFunction: {
        (): Promise<T> | T;
    });
    Scope<O>(getFunction: {
        (val: T): O;
    }, defaultValue?: O): Scope<O>;
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
