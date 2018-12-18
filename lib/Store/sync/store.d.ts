import { Emitter } from "../../emitter";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
export declare class Store<T> {
    private root;
    private emitterMap;
    private diff;
    constructor(idFunction: {
        (val: any): any;
    });
    GetReader(): StoreReader<T>;
    GetWriter(): StoreWriter<T>;
    Diff(path: string, newValue: any, skipDependents: boolean): IDiffResponse;
    GetPathById(id: string): string;
    EnsureEmitter(path: string): Emitter;
    AssignPropertyPath(value: any, path: string): void;
    ResolvePropertyPath(path: string): any;
    DeleteEmitter(path: string): void;
}
export declare namespace Store {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): StoreWriter<T>;
}
