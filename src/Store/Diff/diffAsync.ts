import { DiffTreeFactory, IDiffMethod, IDiffTree } from "./diffTree";
import { WorkerQueue } from "./workerQueue";
import { DiffWorker } from "./diffWorker";
import { JsonDiffResult } from "../../Utils/json";

type IDiffTreeAsync = {
  [property in keyof IDiffTree]: (
    ...args: Parameters<IDiffTree[property]>
  ) => Promise<ReturnType<IDiffTree[property]>>;
};

export class DiffAsync implements IDiffTreeAsync {
  private workerQueue: WorkerQueue<IDiffMethod, JsonDiffResult>;

  constructor(keyFunc?: { (val: any): string }) {
    this.workerQueue = new WorkerQueue(DiffWorker.Create());
    this.workerQueue.Push({
      method: "create",
      arguments: keyFunc ? [keyFunc.toString()] : [],
    });
  }

  public async DiffPath(path: string, value: any) {
    return await this.workerQueue.Push({
      method: "diffpath",
      arguments: [path, value],
    });
  }

  public async DiffBatch(data: Array<{ path: string; value: any }>) {
    return await this.workerQueue.Push({
      method: "diffbatch",
      arguments: [data],
    });
  }

  public Destroy() {
    this.workerQueue.Destroy();
  }
}
