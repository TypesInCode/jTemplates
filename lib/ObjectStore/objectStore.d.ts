import Emitter from "../emitter";
class ObjectStoreEmitter extends Emitter {
    ___path: string;
    constructor(___path: string);
}
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
    GetEmitter(path: string): ObjectStoreEmitter;
    GetValue(path: string): any;
    SetValue(path: string, value: any): void;
    Value<O>(valueFunction: {
        (): O;
    }): Value<O>;
    Write<O>(readOnly: O | string, updateCallback?: {
        (current: O): O;
    } | {
        (current: O): void;
    }): void;
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
    function Value<O>(val: O): Value<O>;
}
export {};
