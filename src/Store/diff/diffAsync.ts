import { WorkerQueue } from "./workerQueue";
import { StoreWorker } from "./storeWorker";
import { Diff, IDiffMethod } from "./diff.types";

export class DiffAsync implements Diff {

    private workerQueue: WorkerQueue<IDiffMethod, any>;

    constructor() {
        this.workerQueue = new WorkerQueue(StoreWorker.Create());
        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
    }

    /* public GetPath(id: string): string {
        return this.diff({
            method: "getpath",
            arguments: [id]
        });
    } */

    public DiffBatch(batch:  Array<{ path: string, newValue: any, oldValue: any }>) {
        return this.workerQueue.Push(() => ({
            method: "diffbatch",
            arguments: [batch]
        }));
    }

    public Diff(path: string, newValue: any, resolveOldValue: { (): any }) { // oldValue: any): Promise<IDiffResponse> {
        return this.workerQueue.Push(() => ({
            method: "diff",
            arguments: [path, newValue, resolveOldValue()]
        }));
        /* return this.diff({
            method: "diff",
            arguments: [path, newValue, oldValue, skipDependents]
        }); */
    }
    
}