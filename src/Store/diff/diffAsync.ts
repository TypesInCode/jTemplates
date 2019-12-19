import { WorkerQueue } from "./workerQueue";
import { StoreWorker } from "./storeWorker";
import { Diff, IDiffMethod } from "./diff.types";

export class DiffAsync implements Diff {

    private workerQueue: WorkerQueue<IDiffMethod, any>;

    constructor() {
        this.workerQueue = new WorkerQueue(StoreWorker.Create());
        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
    }

    public DiffBatch(batch:  Array<{ path: string, newValue: any, oldValue: any }>) {
        return this.workerQueue.Push(() => ({
            method: "diffbatch",
            arguments: [batch]
        }));
    }

    public Destroy() {
        this.workerQueue.Destroy();
    }
    
}