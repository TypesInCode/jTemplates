import { DiffTree, IsRoutePath } from "./diffTree";
import { IDiffMethod, IDiffMethodBatch, IDiffMethodBatchResult } from "./diffTree.types";

export function ConnectWorkerToDiffTree(diffTree: DiffTree, worker: Worker) {

  worker.onmessage = function (event: any) {
    const data = event.data as IDiffMethodBatch;
    const result: IDiffMethodBatchResult = new Array(data.length + 1);
    for (let x = 0; x < data.length; x++) {
      const call = data[x];
      // A route write's own result describes the instance, not root state; its summary (or a
      // deleted instance's slot removal) arrives with the projections at the end of the batch
      if (IsRoutePath(call.arguments[0])) {
        RunMethod(diffTree, call);
        result[x] = { type: "diff", result: [] };
        continue;
      }

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
        case "deleteroute": {
          // Not a route path, so this throws
          diffTree.DeleteRoute(call.arguments[0]);
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

function RunMethod(diffTree: DiffTree, call: IDiffMethod) {
  const args = call.arguments;
  switch (call.method) {
    case "diffpath": return diffTree.DiffPath(args[0], args[1]);
    case "splicepath": return diffTree.SplicePath(args[0], args[1], args[2], args[3]);
    case "pushpath": return diffTree.PushPath(args[0], args[1]);
    case "patchpath": return diffTree.PatchPath(args[0], args[1]);
    case "deleteroute": return diffTree.DeleteRoute(args[0]);
  }
}
