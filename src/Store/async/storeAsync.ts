import { StoreAsyncManager } from "./storeAsyncManager";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { StoreAsyncQuery } from "./storeAsyncQuery";
import { AsyncActionCallback, AsyncQueryCallback, AsyncFuncCallback } from "./storeAsync.types";
import { PromiseQueue } from "../../Promise/promiseQueue";

export class StoreAsync<T> {

    private manager: StoreAsyncManager<T>;
    private reader: StoreAsyncReader<T>;
    private writer: StoreAsyncWriter<T>;
    private queryCache: Map<string, StoreAsyncQuery<any, any>>;
    private promiseQueue: PromiseQueue<any>;

    public get OnComplete(): Promise<StoreAsync<T>> {
        return this.promiseQueue.OnComplete.then(() => {
            return this;
        });
    }

    public get Root(): T {
        return this.reader.Root;
    }

    constructor(idFunction: (val: any) => any) {
        this.manager = new StoreAsyncManager(idFunction);
        this.reader = new StoreAsyncReader<T>(this.manager);
        this.writer = new StoreAsyncWriter<T>(this.manager);
        this.promiseQueue = new PromiseQueue();
        this.queryCache = new Map();
    }

    public Action(action: AsyncActionCallback<T>): Promise<void> {
        return this.promiseQueue.Push(resolve => 
            resolve(action(this.reader, this.writer))
        );
    }

    public Query<O>(id: string, defaultValue: O, queryFunc: AsyncFuncCallback<T, O>): StoreAsyncQuery<T, O> {
        if(this.queryCache.has(id))
            return this.queryCache.get(id);

        var query = new StoreAsyncQuery<T, O>(this.manager, defaultValue, async (reader, writer) => {
            return await this.promiseQueue.Push(resolve => {
                resolve(queryFunc(reader, writer));
            });
        });

        var destroy = () => {
            this.queryCache.delete(id);
            query.removeListener("destroy", destroy);
        };
        query.addListener("destroy", destroy);
        this.queryCache.set(id, query);

        return query;
    }

    public Destroy() {
        this.promiseQueue.Stop();
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.manager.Destroy();
    }

}

export namespace StoreAsync {

    export function Create<T>(init: T, idFunction?: {(val: any): any}): StoreAsync<T> {
        var store = new StoreAsync<T>(idFunction);
        store.Action(async (reader, writer) => {
            await writer.WritePath("root", init);
        });

        return store;
    }

}