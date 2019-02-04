import { StoreAsyncManager } from "./storeAsyncManager";
export declare class StoreAsyncWriter<T> {
    private store;
    constructor(store: StoreAsyncManager<T>);
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): Promise<void>;
    WritePath(path: string, value: any): Promise<void>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Unshift<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    private WriteTo;
    private ResolveUpdateCallback;
    private CreateCopy;
    private ProcessDiff;
    private EmitSet;
}
