import { StoreAsyncQuery } from "./storeAsyncQuery";
import { AsyncActionCallback, AsyncFuncCallback } from "./storeAsync.types";
export declare class StoreAsync<T> {
    private manager;
    private reader;
    private writer;
    private queryCache;
    private promiseQueue;
    readonly OnComplete: Promise<StoreAsync<T>>;
    readonly Root: T;
    constructor(idFunction: (val: any) => any);
    Action(action: AsyncActionCallback<T>): Promise<void>;
    Query<O>(id: string, defaultValue: O, queryFunc: AsyncFuncCallback<T, O>): StoreAsyncQuery<T, O>;
    Destroy(): void;
}
export declare namespace StoreAsync {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): StoreAsync<T>;
}
