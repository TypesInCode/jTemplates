import { DiffTreeScope, IDiffMethod, IDiffResponse } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { DiffWorker } from "./diffWorker";

const diffCnstr = DiffTreeScope();
export class DiffAsync {

    private workerQueue: WorkerQueue<IDiffMethod, IDiffResponse>;

    constructor(keyFunc?: {(val: any): string}) {
        this.workerQueue = new WorkerQueue(DiffWorker.Create());
        this.workerQueue.Push({ method: "create", arguments: [keyFunc.toString()] })
    }

    public static GetKeyRef(key: string) {
        return diffCnstr.GetKeyRef(key);
    }

    public static ReadKeyRef(ref: string) {
        return diffCnstr.ReadKeyRef(ref);
    }

    public async DiffPath(path: string, value: any) {
        return await this.workerQueue.Push({ method: "diffpath", arguments: [path, value] });
    }

    public async DiffBatch(data: Array<{ path: string, value: any }>) {
        return await this.workerQueue.Push({ method: "diffbatch", arguments: [data] });
    }

    public async UpdatePath(path: string, value: any) {
        await this.workerQueue.Push({ method: "updatepath", arguments: [path, value] });
    }

    public Destroy() {
        this.workerQueue.Destroy();
    }

}
