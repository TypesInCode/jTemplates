import { CreateShimDiffWorker } from "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, projections, projectionCases } from "./projection-cases";
import { SequentialProjector } from "../../src/Store/Diff/sequentialProjector";

projectionCases("StoreAsync", () => new StoreAsync(CreateShimDiffWorker(KeyFunc, new SequentialProjector(projections)), KeyFunc));
