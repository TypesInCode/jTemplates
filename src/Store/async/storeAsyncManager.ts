import { Emitter } from "../../emitter";
import { ObjectDiff } from "../objectDiff";
import { WorkerQueue } from "./workerQueue";
import { StoreWorker } from "./storeWorker";
import { PromiseQueue } from "../../Promise/promiseQueue";

export class StoreAsyncManager<T> {

    private root: T;
    private emitterMap: Map<string, Emitter>;
    private worker: Worker;
    private workerQueue: WorkerQueue<IDiffMethod, any>;

    constructor(idFunction: {(val: any): any}) {
        this.emitterMap = new Map();
        this.worker = StoreWorker.Create();
        this.workerQueue = new WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()]}));
    }

    public Diff(path: string, newValue: any, skipDependents: boolean): Promise<IDiffResponse> {
        return this.workerQueue.Push(() => {
            var oldValue = this.ResolvePropertyPath(path);

            if(oldValue.___storeProxy)
                oldValue = oldValue.toJSON();
        
            if(newValue.___storeProxy)
                newValue = newValue.toJSON();

            return {
                method: "diff",
                arguments: [path, newValue, oldValue, skipDependents]
            };
        });
    }

    public GetPathById(id: string): Promise<string> {
        return this.workerQueue.Push(() => ({
            method: "getpath",
            arguments: [id]
        }));
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
        var emitter = this.emitterMap.get(path);
        if(emitter) {
            this.emitterMap.delete(path);
            emitter.emit("destroy", emitter);
        }
    }

    public Destroy() {
        this.root = null;
        this.emitterMap.forEach(value => value.removeAllListeners());
        this.emitterMap.clear();
        this.workerQueue.Stop();
    }

}