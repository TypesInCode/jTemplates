import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
import { TreeNode } from "../tree/treeNode";
// import { StoreQuery } from "./storeQuery";

export interface AsyncActionCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): Promise<void>;
}

export interface AsyncFuncCallback<T, O> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): Promise<O>;
}

export interface IStoreObject {
    ___storeProxy: boolean;

    ___node: TreeNode;

    toJSON(): any;
}

/* export interface QueryCallback<T> {
    (reader: StoreReader<T>, writer: StoreWriter<T>): StoreQuery<T, any>;
} */
