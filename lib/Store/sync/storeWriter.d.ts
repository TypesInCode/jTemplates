import { StoreManager } from "./storeManager";
export declare class StoreWriter<T> {
    private store;
    constructor(store: StoreManager<T>);
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): void;
    WritePath(path: string, value: any): void;
    Push<O>(readOnly: Array<O>, newValue: O): void;
    Unshift<O>(readOnly: Array<O>, newValue: O): void;
    Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>): O[];
    private WriteTo;
    private ResolveUpdateCallback;
    private CreateCopy;
    private ProcessDiff;
    private EmitSet;
}
