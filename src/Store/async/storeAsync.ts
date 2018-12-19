import { Emitter } from "../../emitter";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { WorkerQueue } from "./workerQueue";
import { StoreWorker } from "./storeWorker";
import { DeferredPromise } from "../deferredPromise";
import { StoreAsyncQuery } from "./storeAsyncQuery";

export class StoreAsync<T> {

    private root: T;
    private emitterMap: Map<string, Emitter>;
    // private arrayCacheMap: Map<string, Array<any>>;
    private worker: Worker;
    private workerQueue: WorkerQueue<IDiffMethod, any>;
    private queryQueue: Array<DeferredPromise<any>>;
    private queryCache: Map<string, StoreAsyncQuery<any>>;

    constructor(idFunction: {(val: any): any}) {
        this.emitterMap = new Map();
        this.worker = StoreWorker.Create();
        this.workerQueue = new WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()]}));
        this.queryQueue = [];
        // this.arrayCacheMap = new Map();
        this.queryCache = new Map();
    }

    public GetQuery<O>(id: string, defaultValue: any, callback: {(reader: StoreAsyncReader<T>): Promise<O>}) {
        var query = this.queryCache.get(id);
        if(!query) {
            query = new StoreAsyncQuery<O>(this, callback, defaultValue);
            this.queryCache.set(id, query);
        }
        return query;
    }

    public GetReader(): StoreAsyncReader<T> {
        return new StoreAsyncReader(this);
    }

    public GetWriter(): StoreAsyncWriter<T> {
        return new StoreAsyncWriter(this);
    }

    public ProcessStoreQueue() {
        this.workerQueue.Process();
    }
    
    public QueryStart(): Promise<void> {
        this.queryQueue.push(new DeferredPromise(resolve => resolve()));
        if(this.queryQueue.length === 1)
            this.queryQueue[0].Invoke();

        return this.queryQueue[this.queryQueue.length - 1];
    }

    public QueryEnd() {
        this.queryQueue.shift();
        if(this.queryQueue.length > 0)
            this.queryQueue[0].Invoke();
    }

    public Diff(path: string, newValue: any, skipDependents: boolean): Promise<IDiffResponse> {
        return new Promise(resolve => {
            var oldValue = this.ResolvePropertyPath(path);
            var promise = this.workerQueue.Push(() => ({
                method: "diff",
                arguments: [path, newValue, oldValue, skipDependents]
            }));
            resolve(promise);
            this.ProcessStoreQueue();
        });
    }

    public GetPathById(id: string): Promise<string> {
        return new Promise(resolve => {
            var promise = this.workerQueue.Push(() => ({
                method: "getpath",
                arguments: [id]
            }));
            resolve(promise);
            this.ProcessStoreQueue();
        });
    }

    public AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));

        (parentObj as any)[prop] = value;
    }

    public ResolvePropertyPath(path: string) {
        if(!path)
            return this;
        
        return path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this);
    }

    public EnsureEmitter(path: string): Emitter {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }

        return emitter;
    }

    public DeleteEmitter(path: string) {
        this.emitterMap.delete(path);
    }

    /* public GetCachedArray(path: string) {
        return this.arrayCacheMap.get(path);
    }

    public SetCachedArray(path: string, array: Array<any>) {
        this.arrayCacheMap.set(path, array);
    } */

}

export namespace StoreAsync {
    export function Create<T>(init: T, idFunction?: {(val: any): any}): StoreAsyncWriter<T> {
        var store = new StoreAsync<T>(idFunction);
        var writer = store.GetWriter();
        writer.Root = init;
        return writer;
    }
}