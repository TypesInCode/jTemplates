import { StoreAsync } from "./storeAsync";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncQuery } from "./storeAsyncQuery";
export declare class StoreAsyncWriter<T> {
    private store;
    Root: T;
    constructor(store: StoreAsync<T>);
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): Promise<void>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Query<O>(defaultValue: any, callback: {
        (reader: StoreAsyncReader<T>): Promise<O>;
    }): StoreAsyncQuery<O>;
    private WriteTo;
    private ResolveUpdateCallback;
    private CreateCopy;
    private ProcessDiff;
    private EmitSet;
}
