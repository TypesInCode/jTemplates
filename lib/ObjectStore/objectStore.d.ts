import Emitter from "../emitter";
export declare abstract class Value<T> {
    Value: T;
    constructor();
    protected abstract getValue(): T;
    protected abstract setValue(val: T): void;
    toString(): string;
    valueOf(): Object;
}
export declare class ObjectStore<T> {
    private getIdCallback;
    private emitterMap;
    private getterMap;
    private idToPathsMap;
    private root;
    Root: T;
    constructor(idCallback?: {
        (val: any): any;
    });
    Get<T>(id: string): T;
    GetPath(path: string): any;
    SetPath(path: string, value: any): void;
    GetEmitter(path: string): Emitter;
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): void;
    Push<O>(readOnly: Array<O>, newValue: O): void;
    private WriteTo;
    private ProcessChanges;
    private CleanUp;
    private AssignPropertyPath;
    private ResolvePropertyPath;
    private CreateGetterObject;
    private CreateGetter;
    private CreateCopy;
    private EmitSet;
    private EmitGet;
}
export declare namespace ObjectStore {
    function Create<T>(value: T, idCallback?: {
        (val: any): any;
    }): ObjectStore<T>;
    function Watch(callback: {
        (): void;
    }): Array<Emitter>;
    function Value<O>(valueFunction: {
        (): O;
    }): Value<O>;
}
