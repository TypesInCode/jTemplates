import { Emitter } from "../../emitter";
import { StoreAsyncReader } from "./storeAsyncReader";
import { StoreAsyncWriter } from "./storeAsyncWriter";
import { WorkerQueue } from "./workerQueue";
import { StoreWorker } from "./storeWorker";

export class StoreAsync<T> {

    private root: T;
    private emitterMap: Map<string, Emitter>;
    private worker: Worker;
    private workerQueue: WorkerQueue<IDiffMethod, any>;

    constructor(idFunction: {(val: any): any}) {
        this.emitterMap = new Map();
        this.worker = StoreWorker.Create();
        this.workerQueue = new WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()]}))
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

    public EnsureEmitter(path: string): Emitter {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }

        return emitter;
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

    public DeleteEmitter(path: string) {
        this.emitterMap.delete(path);
    }

}

export namespace StoreAsync {
    export function Create<T>(init: T, idFunction?: {(val: any): any}): StoreAsyncWriter<T> {
        var store = new StoreAsync<T>(idFunction);
        var writer = store.GetWriter();
        writer.Root = init;
        return writer;
    }
}