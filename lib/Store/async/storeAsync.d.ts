import { Emitter } from "../../emitter";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
export declare class StoreAsync<T> {
    private root;
    private emitterMap;
    private arrayCacheMap;
    private worker;
    private workerQueue;
    private queryQueue;
    constructor(idFunction: {
        (val: any): any;
    });
    GetReader(): StoreAsyncReader<T>;
    GetWriter(): StoreAsyncWriter<T>;
    ProcessStoreQueue(): void;
    QueryStart(): Promise<void>;
    QueryEnd(): void;
    Diff(path: string, newValue: any, skipDependents: boolean): Promise<IDiffResponse>;
    GetPathById(id: string): Promise<string>;
    AssignPropertyPath(value: any, path: string): void;
    ResolvePropertyPath(path: string): any;
    EnsureEmitter(path: string): Emitter;
    DeleteEmitter(path: string): void;
    GetCachedArray(path: string): any[];
    SetCachedArray(path: string, array: Array<any>): void;
}
export declare namespace StoreAsync {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): StoreAsyncWriter<T>;
}
