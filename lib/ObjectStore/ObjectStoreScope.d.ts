import { Emitter } from '../emitter';
export declare class Scope<T> extends Emitter {
    private getFunction;
    private trackedEmitters;
    private setCallback;
    private value;
    private defaultValue;
    private dirty;
    private isSync;
    readonly Value: T;
    constructor(getFunction: {
        (): Promise<T> | T;
    }, defaultValue: T);
    Scope<O>(getFunction: {
        (val: T): Promise<O> | O;
    }, defaultValue: O): Scope<O>;
    Destroy(): void;
    private UpdateEmitters;
    private UpdateValue;
    private SetCallback;
}
