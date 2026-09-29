import { CreateShimDiffWorker } from "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, projections, projectionCases } from "./projection-cases";

projectionCases("StoreAsync", () => new StoreAsync(CreateShimDiffWorker(KeyFunc, projections), KeyFunc));
