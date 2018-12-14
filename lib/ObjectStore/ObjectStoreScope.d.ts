import { Emitter } from '../emitter';
export declare class Scope<T> extends Emitter {
    private getFunction;
    private setFunction;
    private trackedEmitters;
    private dirty;
    private value;
    private setCallback;
    Value: T;
    constructor(getFunction: {
        (): Promise<T> | T;
    }, setFunction?: {
        (val: T): void;
    });
    Scope<O>(getFunction: {
        (val: T): O;
    }, setFunction?: {
        (val: T, next: O): void;
    }): Scope<O>;
    Destroy(): void;
    private UpdateValue;
    private SetCallback;
}
