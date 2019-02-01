import { Emitter } from "../../emitter";
export declare class StoreAsyncManager<T> {
    private root;
    private emitterMap;
    private worker;
    private workerQueue;
    constructor(idFunction: {
        (val: any): any;
    });
    Diff(path: string, newValue: any, skipDependents: boolean): Promise<IDiffResponse>;
    GetPathById(id: string): Promise<string>;
    EnsureEmitter(path: string): Emitter;
    AssignPropertyPath(value: any, path: string): void;
    ResolvePropertyPath(path: string): any;
    DeleteEmitter(path: string): void;
    Destroy(): void;
}
