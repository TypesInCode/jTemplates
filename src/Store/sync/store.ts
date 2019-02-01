import { ActionCallback, FuncCallback } from "./store.types";
import { StoreManager } from "./storeManager";
import { StoreReader } from "./storeReader";
import { StoreWriter } from "./storeWriter";
import { StoreQuery } from "./storeQuery";

export class Store<T> {

    private manager: StoreManager<T>;
    private reader: StoreReader<T>;
    private writer: StoreWriter<T>;
    private queryCache: Map<string, StoreQuery<any, any>>;

    public get Root(): T {
        return this.reader.Root;
    }

    constructor(idFunction: (val: any) => any) {
        this.manager = new StoreManager(idFunction);
        this.reader = new StoreReader<T>(this.manager);
        this.writer = new StoreWriter<T>(this.manager);
        this.queryCache = new Map();
    }

    public Action(action: ActionCallback<T>) {
        action(this.reader, this.writer);
    }

    public Query<O>(id: string, queryFunc: FuncCallback<T, O>): StoreQuery<T, O> {
        if(this.queryCache.has(id))
            return this.queryCache.get(id);

        var query = new StoreQuery<T, O>(this.manager, queryFunc);
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

export namespace Store {

    export function Create<T>(init: T, idFunction?: {(val: any): any}): Store<T> {
        var store = new Store<T>(idFunction);
        store.Action((reader, writer) => {
            writer.WritePath("root", init);
        });

        return store;
    }

}