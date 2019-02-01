import { Emitter } from "../../emitter";
export declare class StoreManager<T> {
    private root;
    private emitterMap;
    private diff;
    constructor(idFunction: {
        (val: any): any;
    });
    Diff(path: string, newValue: any, skipDependents: boolean): IDiffResponse;
    GetPathById(id: string): string;
    EnsureEmitter(path: string): Emitter;
    AssignPropertyPath(value: any, path: string): void;
    ResolvePropertyPath(path: string): any;
    DeleteEmitter(path: string): void;
    Destroy(): void;
}
