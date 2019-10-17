import { AsyncActionCallback, AsyncFuncCallback } from "./store.types";
import { StoreQuery } from "./storeQuery";
import { Diff } from "../diff/diff.types";
export declare class AbstractStore {
    Action(action: AsyncActionCallback<any>): Promise<void>;
    Update(updateCallback: {
        (val: any): void;
    } | any): Promise<void>;
    Merge(value: Partial<any>): Promise<void>;
    Write(value: any): Promise<void>;
    Get(id?: string): Promise<any>;
    ToJSON<O>(readOnly: O): O;
    Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<any, O>): StoreQuery<any, O>;
}
export declare class Store<T> extends AbstractStore {
    private manager;
    private reader;
    private writer;
    private queryCache;
    private promiseQueue;
    private init;
    readonly Root: StoreQuery<T, T>;
    constructor(idFunction: (val: any) => any, init: T, diff: Diff);
    Action(action: AsyncActionCallback<T>): Promise<void>;
    Next(action?: () => void): Promise<void>;
    Update(updateOrCallback: {
        (val: T): void;
    } | T): Promise<void>;
    Merge(value: Partial<T>): Promise<void>;
    Get<O = T>(id?: string): Promise<O>;
    Write(value: any): Promise<void>;
    Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<T, O>): StoreQuery<T, O>;
    Destroy(): void;
}
