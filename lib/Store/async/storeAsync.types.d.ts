import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { StoreAsyncQuery } from "./storeAsyncQuery";
export interface AsyncActionCallback<T> {
    (reader: StoreAsyncReader<T>, writer: StoreAsyncWriter<T>): Promise<void>;
}
export interface AsyncFuncCallback<T, O> {
    (reader: StoreAsyncReader<T>, writer: StoreAsyncWriter<T>): Promise<O>;
}
export interface AsyncQueryCallback<T> {
    (reader: StoreAsyncReader<T>, writer: StoreAsyncWriter<T>): StoreAsyncQuery<T, any>;
}
