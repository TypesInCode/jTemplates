import { Emitter } from '../emitter';
export declare class Scope<T> extends Emitter {
    private getFunction;
    private defaultValue;
    private trackedEmitters;
    private dirty;
    private value;
    private setCallback;
    readonly Value: T;
    constructor(getFunction: {
        (): Promise<T> | T;
    }, defaultValue?: T);
    Scope<O>(getFunction: {
        (val: T): O;
    }, defaultValue?: O): Scope<O>;
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
