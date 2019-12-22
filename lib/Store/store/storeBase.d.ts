import { AsyncActionCallback, ActionCallback, FuncCallback } from "./store.types";
import { Diff } from "../diff/diff.types";
import { Scope } from "../scope/scope";
export declare class AbstractStore {
    ActionSync(action: ActionCallback<any>): void;
    Action(action: AsyncActionCallback<any>): Promise<void>;
    Update(updateCallback: {
        (val: any): void;
    } | any): Promise<void>;
    Merge(value: Partial<any>): Promise<void>;
    Write(value: any): Promise<void>;
    Get(id?: string): Promise<any>;
    Query<O>(queryFunc: FuncCallback<any, O>): Scope<O>;
}
export declare class StoreBase<T> implements AbstractStore {
    private manager;
    private reader;
    private writer;
    private promiseQueue;
    private rootScope;
    readonly Root: Scope<T>;
    constructor(idFunction: (val: any) => any, init: T, diff: Diff);
    Action(action: AsyncActionCallback<T>): Promise<void>;
    ActionSync(action: ActionCallback<T>): void;
    Next(action?: () => void): Promise<void>;
    Update(value: T): Promise<void>;
    Merge(value: Partial<T>): Promise<void>;
    Get<O>(id?: string): O;
    Write(value: any): Promise<void>;
    Query<O>(queryFunc: FuncCallback<T, O>): Scope<O>;
    Destroy(): void;
}
