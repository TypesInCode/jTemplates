import { Scope } from "./objectStoreScope";
export declare class StoreAsync<T> {
    private getIdCallback;
    private emitterMap;
    private getterMap;
    private idToPathsMap;
    private root;
    private workerQueue;
    Root: T;
    constructor(idCallback?: {
        (val: any): any;
    });
    Scope<O>(valueFunction: {
        (root: T): O;
    }, setFunction?: {
        (val: T, next: O): void;
    }): Scope<O>;
    Get<O>(id: string): O;
    Write<O>(readOnly: O, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): Promise<any>;
    Push<O>(readOnly: Array<O>, newValue: O): void;
    private WriteToSync;
    private WriteToAsync;
    private ProcessChanges;
    private DeleteProperties;
    private CleanMaps;
    private AssignPropertyPath;
    private ResolvePropertyPath;
    private CreateGetterObject;
    private CreateGetter;
    private CreateCopy;
    private EmitSet;
    private EmitGet;
}
export declare namespace StoreAsync {
    function Create<T>(value: T, idCallback?: {
        (val: any): any;
    }): StoreAsync<T>;
}
