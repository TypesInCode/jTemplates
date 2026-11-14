import { CreateShimDiffWorker } from "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, routes, projectionCases } from "./projection-cases";

projectionCases("StoreAsync", () => new StoreAsync(CreateShimDiffWorker(KeyFunc, routes), { keyFunc: KeyFunc }));
