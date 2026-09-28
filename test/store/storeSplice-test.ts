import { StoreSync } from "../../src/Store/Store/storeSync";
import { KeyFunc, spliceCases } from "./splice-cases";

spliceCases("StoreSync", () => new StoreSync(KeyFunc));
