import { CreateShimDiffWorker } from "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, snapshotCases } from "./snapshot-cases";

snapshotCases("StoreAsync", () => new StoreAsync(CreateShimDiffWorker(KeyFunc), KeyFunc));
