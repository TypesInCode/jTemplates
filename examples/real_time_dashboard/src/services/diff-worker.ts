/**
 * @file diff-worker.ts
 * @description Worker entry file for DataService's StoreAsync instance.
 *
 * StoreAsync no longer builds or serializes a worker itself — it takes an
 * already-running one. This file is that worker: it's bundled separately (Vite
 * handles `new Worker(new URL("./diff-worker.ts", import.meta.url), { type: "module" })`
 * automatically) and constructs the same key function DataService's own `keyFunc`
 * argument uses, so entity flattening is consistent on both sides of the worker
 * boundary.
 *
 * @see src/Store/Diff/diffTree.ts - DiffTree
 * @see src/Store/Diff/diffTreeWorker.ts - ConnectWorkerToDiffTree
 */
import { DiffTree } from "j-templates/Store/Diff/diffTree";
import { ConnectWorkerToDiffTree } from "j-templates/Store/Diff/diffTreeWorker";

const diffTree = new DiffTree((value: any) => value?.id);
ConnectWorkerToDiffTree(diffTree, self as any as Worker);
