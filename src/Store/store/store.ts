import { AsyncActionCallback, AsyncFuncCallback, IStoreObject } from "./store.types";
import { StoreManager } from "./storeManager";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
import { PromiseQueue } from "../../Promise/promiseQueue";
import { StoreQuery } from "./storeQuery";
import { Diff } from "../diff/diff.types";

export class AbstractStore {
    public async Action(action: AsyncActionCallback<any>): Promise<void> { }

    public async Update<O>(readOnly: O, updateCallback: { (val: O): void } | O): Promise<void> { }

    public ToJSON<O>(readOnly: O): O { return null; }

    public Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<any, O>): StoreQuery<any, O> {
        return null;
    }
}

export class Store<T> extends AbstractStore {

    private manager: StoreManager<T>;
    private reader: StoreReader<T>;
    private writer: StoreWriter<T>;
    private queryCache: Map<string, StoreQuery<any, any>>;
    private promiseQueue: PromiseQueue<any>;
    private init: any;

    public get Root(): StoreQuery<T, T> {
        return this.Query("root", this.init, async (reader) => reader.Root);
    }

    constructor(idFunction: (val: any) => any, init: any, diff: Diff) {
        super();
        this.manager = new StoreManager(idFunction, diff);
        this.reader = new StoreReader<T>(this.manager);
        this.writer = new StoreWriter<T>(this.manager);
        this.promiseQueue = new PromiseQueue();
        this.queryCache = new Map();
        this.init = init;
        this.Action(async () => {
            await this.manager.WritePath("root", init); // writer.WritePath("root", init);
        });
    }

    public async Action(action: AsyncActionCallback<T>) {
        await this.promiseQueue.Push((resolve) => {
            resolve(action(this.reader, this.writer));
        });
    }

    public async Update<O>(readOnly: O, updateCallback: { (val: O): void } | O) {
        await this.Action(async (reader, writer) => {
            await writer.Update(readOnly, updateCallback);
        });
    }

    public ToJSON<O>(readOnly: O) {        
        var rOnly = readOnly as any as IStoreObject;
        if(rOnly && rOnly.___storeProxy)
            return rOnly.toJSON();

        throw "parameter readOnly is not a store object";
    }

    public async Write(value: any) {
        await this.Action(async (reader, writer) => {
            await writer.Write(value);
        });
    }

    /* public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope<O>(() => callback(this.Root.Value));
    } */

    public Query<O>(id: string, defaultValue: any, queryFunc: AsyncFuncCallback<T, O>): StoreQuery<T, O> {
        if(this.queryCache.has(id))
            return this.queryCache.get(id);

        var query = new StoreQuery<T, O>(this, defaultValue, queryFunc);
        /* var query = new StoreQuery<T, O>(this, defaultValue, async (reader, writer) => {
            return await this.promiseQueue.Push(resolve => {
                resolve(queryFunc(reader, writer));
            });
        }); */

        var destroy = () => {
            this.queryCache.delete(id);
            query.removeListener("destroy", destroy);
        };
        query.addListener("destroy", destroy);
        this.queryCache.set(id, query);

        return query;
    }

    public Destroy() {
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.manager.Destroy();
    }

}

/* export namespace Store {

    export function Create<T>(init: T, idFunction?: {(val: any): any}): Store<T> {
        var store = new Store<T>(idFunction, init);

        return store;
    }

} */