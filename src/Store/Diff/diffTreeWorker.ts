import { DiffTree } from "./diffTree";
import { IDiffMethodBatch, IDiffMethodBatchResult } from "./diffTree.types";

export function ConnectWorkerToDiffTree(diffTree: DiffTree, worker: Worker) {

  worker.onmessage = function (event: any) {
    const data = event.data as IDiffMethodBatch;
    const result: IDiffMethodBatchResult = new Array(data.length + 1);
    for (let x = 0; x < data.length; x++) {
      const call = data[x];
      switch (call.method) {
        case "diffpath": {
          result[x] = {
            type: "diff",
            result: diffTree.DiffPath(call.arguments[0], call.arguments[1])
          }
          break;
        }
        case "splicepath": {
          result[x] = {
            type: "splice",
            result: diffTree.SplicePath(call.arguments[0], call.arguments[1], call.arguments[2], call.arguments[3])
          };
          break;
        }
        case "pushpath": {
          result[x] = {
            type: "diff",
            result: diffTree.PushPath(call.arguments[0], call.arguments[1])
          };
          break;
        }
        case "patchpath": {
          result[x] = {
            type: "diff",
            result: diffTree.PatchPath(call.arguments[0], call.arguments[1])
          };
          break;
        }
      }
    }

    result[result.length - 1] = {
      type: "diff",
      result: diffTree.RunProjections()
    };
    worker.postMessage(result);
  };
}
