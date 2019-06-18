import { AsyncActionCallback, AsyncFuncCallback } from "./store.types";
import { StoreQuery } from "./storeQuery";
import { Diff } from "../diff/diff.types";
export declare class Store<T> {
    private manager;
    private reader;
    private writer;
    private queryCache;
    private promiseQueue;
    private init;
    readonly Root: StoreQuery<T, T>;
    constructor(idFunction: (val: any) => any, init: any, diff: Diff);
    Action(action: AsyncActionCallback<T>): void;
    Write<O>(readOnly: O, updateCallback: {
        (val: O): void;
    }): void;
    Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<T, O>): StoreQuery<T, O>;
    Destroy(): void;
}
