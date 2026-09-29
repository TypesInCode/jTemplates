import "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, projections, projectionCases } from "./projection-cases";

projectionCases("StoreAsync", () => new StoreAsync(KeyFunc, projections));
