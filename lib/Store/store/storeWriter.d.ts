import { StoreManager } from "./storeManager";
import { IProxy } from "../tree/proxy";
export declare class StoreWriter<T> {
    private store;
    constructor(store: StoreManager<T>);
    Write(value: any): Promise<void>;
    Update<O>(readOnly: O | IProxy, value: O): Promise<void>;
    Merge<O>(readOnly: O | IProxy, value: Partial<O>): Promise<void>;
    Push<O>(readOnly: Array<O> | IProxy, newValue: O): Promise<void>;
    Splice<O>(readOnly: Array<O> | IProxy, start: number, deleteCount?: number, ...items: Array<O>): Promise<O[]>;
}
