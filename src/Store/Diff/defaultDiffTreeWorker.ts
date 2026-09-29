import { DiffTree } from "./diffTree";
import { ConnectWorkerToDiffTree } from "./diffTreeWorker";

const diffTree = new DiffTree();
ConnectWorkerToDiffTree(diffTree, self as any as Worker);
