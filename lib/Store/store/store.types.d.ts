import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
export interface AsyncActionCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): Promise<void>;
}
export interface AsyncFuncCallback<T, O> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): Promise<O>;
}
