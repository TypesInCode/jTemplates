import { Emitter } from "../../emitter";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
export declare class StoreAsync<T> {
    private root;
    private emitterMap;
    private worker;
    private workerQueue;
    constructor(idFunction: {
        (val: any): any;
    });
    GetReader(): StoreAsyncReader<T>;
    GetWriter(): StoreAsyncWriter<T>;
    ProcessStoreQueue(): void;
    OnComplete(): Promise<void>;
    Diff(path: string, newValue: any, skipDependents: boolean): Promise<IDiffResponse>;
    GetPathById(id: string): Promise<string>;
    EnsureEmitter(path: string): Emitter;
    AssignPropertyPath(value: any, path: string): void;
    ResolvePropertyPath(path: string): any;
    DeleteEmitter(path: string): void;
}
export declare namespace StoreAsync {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): StoreAsyncWriter<T>;
}
