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
    WritePath(path: string, value: any): Promise<void>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Query<O>(id: string, defaultValue: any, callback: {
        (reader: StoreAsyncReader<T>): Promise<O>;
    }): StoreAsyncQuery<any>;
    private WriteTo;
    private ResolveUpdateCallback;
    private CreateCopy;
    private ProcessDiff;
    private EmitSet;
}
