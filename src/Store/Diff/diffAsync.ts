import { DiffTreeFactory, IDiffMethod, IDiffTree } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { DiffWorker } from "./diffWorker";
import { JsonDiffResult } from "../../Utils/json";

// type ToAsync<F extends (...args: any) => any> = 

type IDiffTreeAsync = {
    [property in keyof IDiffTree]: (...args: Parameters<IDiffTree[property]>) => Promise<ReturnType<IDiffTree[property]>>
}

export class DiffAsync implements IDiffTreeAsync {

    private workerQueue: WorkerQueue<IDiffMethod, JsonDiffResult>;

    constructor(keyFunc?: {(val: any): string}) {
        this.workerQueue = new WorkerQueue(DiffWorker.Create());
        this.workerQueue.Push({ method: "create", arguments: keyFunc ? [keyFunc.toString()] : [] })
    }

    /* public static GetKeyRef(key: string) {
        return diffCnstr.GetKeyRef(key);
    }

    public static ReadKeyRef(ref: string) {
        return diffCnstr.ReadKeyRef(ref);
    } */

    public async DiffPath(path: string, value: any) {
        return await this.workerQueue.Push({ method: "diffpath", arguments: [path, value] });
    }

    public async DiffBatch(data: Array<{ path: string, value: any }>) {
        return await this.workerQueue.Push({ method: "diffbatch", arguments: [data] });
    }

    /* public async UpdatePath(path: string, value: any) {
        await this.workerQueue.Push({ method: "updatepath", arguments: [path, value] });
    }

    public async GetPath(path: string) {
        return await this.workerQueue.Push({ method: "getpath", arguments: [path] }) as any;
    } */

    public Destroy() {
        this.workerQueue.Destroy();
    }

}
