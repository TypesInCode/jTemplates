import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";

export interface AsyncActionCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): Promise<void>;
}

export interface ActionCallback<T> {
    (reader: StoreReader<T>): void;
}

export interface FuncCallback<T, O> {
    (reader: StoreReader<T>): O;
}
