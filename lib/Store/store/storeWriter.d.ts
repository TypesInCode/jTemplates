import { StoreManager } from "./storeManager";
export declare class StoreWriter<T> {
    private store;
    constructor(store: StoreManager<T>);
    Write<O>(readOnly: O | string, updateCallback: {
        (current: O): O;
    } | {
        (current: O): void;
    } | O): Promise<void>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Unshift<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>): any;
}
