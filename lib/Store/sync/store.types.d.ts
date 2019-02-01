import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
import { StoreQuery } from "./storeQuery";
export interface ActionCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): void;
}
export interface FuncCallback<T, O> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): O;
}
export interface QueryCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): StoreQuery<T, any>;
}
