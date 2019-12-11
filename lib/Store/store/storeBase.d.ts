import { AsyncActionCallback, AsyncFuncCallback, ActionCallback, FuncCallback } from "./store.types";
import { Diff } from "../diff/diff.types";
import { StoreQuery } from "./storeQuery";
export declare class AbstractStore {
    Action(action: AsyncActionCallback<any>): Promise<void>;
    Update(updateCallback: {
        (val: any): void;
    } | any): Promise<void>;
    Merge(value: Partial<any>): Promise<void>;
    Write(value: any): Promise<void>;
    Get(id?: string): Promise<any>;
    Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<any, O>): StoreQuery<any, O>;
}
export declare class StoreBase<T> extends AbstractStore {
    private manager;
    private reader;
    private writer;
    private queryCache;
    private init;
    private promiseQueue;
    readonly Root: StoreQuery<T, T>;
    constructor(idFunction: (val: any) => any, init: T, diff: Diff);
    Action(action: AsyncActionCallback<T>): Promise<void>;
    ActionSync(action: ActionCallback<T>): void;
    Next(action?: () => void): Promise<void>;
    Update(updateOrCallback: {
        (val: T): void;
    } | T): Promise<void>;
    Merge(value: Partial<T>): Promise<void>;
    Get<O = T>(id?: string): Promise<O>;
    Write(value: any): Promise<void>;
    QuerySync<O>(id: string, defaultValue: O, queryFunc: FuncCallback<T, O>): StoreQuery<T, O>;
    Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<T, O>): StoreQuery<T, O>;
    Destroy(): void;
}
