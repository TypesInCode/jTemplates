import "./worker-shim";
import { StoreAsync } from "../../src/Store/Store/storeAsync";
import { KeyFunc, snapshotCases } from "./snapshot-cases";

snapshotCases("StoreAsync", () => new StoreAsync(KeyFunc));
