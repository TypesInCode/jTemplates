import { CreateShimDiffWorker } from "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, spliceCases } from "./splice-cases";

spliceCases("StoreAsync", () => new StoreAsync(CreateShimDiffWorker(KeyFunc), KeyFunc));
