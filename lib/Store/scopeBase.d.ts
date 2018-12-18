import Emitter from "../emitter";
export declare abstract class ScopeBase<T> extends Emitter {
    private getFunction;
    private emitters;
    private setCallback;
    private defaultValue;
    private value;
    private dirty;
    private valueScopes;
    readonly Value: T;
    constructor(getFunction: {
        (...args: Array<any>): T | Promise<T>;
    }, defaultValue?: T);
    Destroy(): void;
    protected abstract UpdateValue(callback: {
        (emitters: Set<Emitter>, value: T): void;
    }): void;
    protected GetNewValue(...args: Array<any>): any;
    private UpdateValueBase;
    private UpdateEmitters;
    private SetCallback;
}
