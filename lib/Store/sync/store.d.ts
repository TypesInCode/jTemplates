import { ActionCallback, FuncCallback } from "./store.types";
import { StoreQuery } from "./storeQuery";
export declare class Store<T> {
    private manager;
    private reader;
    private writer;
    private queryCache;
    readonly Root: T;
    constructor(idFunction: (val: any) => any);
    Action(action: ActionCallback<T>): void;
    Query<O>(id: string, queryFunc: FuncCallback<T, O>): StoreQuery<T, O>;
    Destroy(): void;
}
export declare namespace Store {
    function Create<T>(init: T, idFunction?: {
        (val: any): any;
    }): Store<T>;
}
