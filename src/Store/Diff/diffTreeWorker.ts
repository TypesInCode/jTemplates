import { DiffTree } from "./diffTree";
import { IDiffMethod, IDiffMethodBatch } from "./diffTree.types";

/**
 * Runs each batch of method calls a `StoreAsync` sends on the tree, then its projections, and
 * posts back the tree's `Commit()` diff for the store to apply.
 */
export function ConnectWorkerToDiffTree(diffTree: DiffTree, worker: Worker) {
  worker.onmessage = function (event: any) {
    const data = event.data as IDiffMethodBatch;
    for (let x = 0; x < data.length; x++)
      RunMethod(diffTree, data[x]);

    diffTree.RunProjections();
    worker.postMessage(diffTree.Commit());
  };
}

function RunMethod(diffTree: DiffTree, call: IDiffMethod) {
  const args = call.arguments;
  switch (call.method) {
    case "writepath": return diffTree.WritePath(args[0], args[1]);
    case "splicepath": return diffTree.SplicePath(args[0], args[1], args[2], args[3]);
    case "pushpath": return diffTree.PushPath(args[0], args[1]);
    case "patchpath": return diffTree.PatchPath(args[0], args[1]);
    case "markopaque": return diffTree.MarkOpaque(args[0]);
  }
}
