import { Scope } from "./objectStoreScope";
export declare class Store<T> {
    private getIdCallback;
    private emitterMap;
    private getterMap;
    private root;
    private diff;
    Root: T;
    constructor(idCallback?: {
        (val: any): any;
    });
    Scope<O>(valueFunction: {
        (root: T): O;
    }): Scope<O>;
    Get<O>(id: string): Promise<O>;
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): Promise<any>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    private WriteToSync;
    private ResolveUpdateCallback;
    private ProcessDiff;
    private AssignPropertyPath;
    private ResolvePropertyPath;
    private CreateGetterObject;
    private CreateGetter;
    private CreateCopy;
    private EmitSet;
    private EmitGet;
}
export declare namespace Store {
    function Create<T>(value: T, idCallback?: {
        (val: any): any;
    }): Store<T>;
}
