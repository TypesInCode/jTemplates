import { Store } from "./store";
import { StoreReader } from "./storeReader";
import { StoreQuery } from "./storeQuery";
export declare class StoreWriter<T> {
    private store;
    Root: T;
    constructor(store: Store<T>);
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): void;
    Push<O>(readOnly: Array<O>, newValue: O): void;
    Query<O>(callback: {
        (reader: StoreReader<T>): O;
    }): StoreQuery<O>;
    private WriteTo;
    private ResolveUpdateCallback;
    private CreateCopy;
    private ProcessDiff;
    private EmitSet;
}
