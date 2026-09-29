import { DiffTree } from "./diffTree";

export interface IDiffMethod {
  /** The method to call */
  method: "create" | "diffpath" | "splicepath" | "diffbatch" | "updatepath" | "getpath";
  /** Arguments for the method call */
  arguments: Array<any>;
}

export function ConnectWorkerToDiffTree(diffTree: DiffTree, worker: Worker) {

  worker.onmessage = function (event: any) {
    const data = event.data as IDiffMethod;
    switch (data.method) {
      case "diffpath": {
        const diff = diffTree.DiffPath(data.arguments[0], data.arguments[1], data.arguments[2]);
        worker.postMessage(diff);
        break;
      }
      case "splicepath": {
        const diff = diffTree.SplicePath(data.arguments[0], data.arguments[1], data.arguments[2], data.arguments[3], data.arguments[4]);
        worker.postMessage(diff);
        break;
      }
      case "diffbatch": {
        const diff = diffTree.DiffBatch(data.arguments[0]);
        worker.postMessage(diff);
        break;
      }
      case "getpath": {
        const ret = diffTree.GetPath(data.arguments[0]);
        worker.postMessage(ret);
        break;
      }
    }
  };
}
