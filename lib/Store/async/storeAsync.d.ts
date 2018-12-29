import { Emitter } from "../../emitter";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { StoreAsyncQuery } from "./storeAsyncQuery";
export declare class StoreAsync<T> {
    private root;
    private emitterMap;
    private worker;
    private workerQueue;
    private queryQueue;
    private queryCache;
    constructor(idFunction: {
        (val: any): any;
    });
    GetQuery<O>(id: string, defaultValue: any, callback: {
        (reader: StoreAsyncReader<T>): Promise<O>;
    }): StoreAsyncQuery<any>;
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
    Destroy(): void;
}
export declare namespace StoreAsync {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): StoreAsyncWriter<T>;
}
