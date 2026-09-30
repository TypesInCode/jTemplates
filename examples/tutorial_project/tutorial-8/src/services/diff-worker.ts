// Worker entry file for RealProjectService's StoreAsync instance.
//
// StoreAsync takes an already-running Worker rather than building or serializing
// one itself, so this file is bundled separately (Vite handles
// `new Worker(new URL("./diff-worker.ts", import.meta.url), { type: "module" })`)
// and constructs the same key function RealProjectService's own `keyFunc`
// argument uses, so entity flattening is consistent on both sides of the worker
// boundary.
import { DiffTree } from "j-templates/Store/Diff/diffTree";
import { ConnectWorkerToDiffTree } from "j-templates/Store/Diff/diffTreeWorker";

const diffTree = new DiffTree((value: any) => value.id);
ConnectWorkerToDiffTree(diffTree, self as any as Worker);
