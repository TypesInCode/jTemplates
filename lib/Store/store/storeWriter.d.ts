import { StoreManager } from "./storeManager";
export declare class StoreWriter<T> {
    private store;
    constructor(store: StoreManager<T>);
    Write(value: any): Promise<void>;
    Update<O>(readOnly: O | string, updateCallback: {
        (current: O): void;
    } | O): Promise<void>;
    Push<O>(readOnly: Array<O>, newValue: O): Promise<void>;
    Pop<O>(readOnly: Array<O>): O;
    Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>): any;
}
