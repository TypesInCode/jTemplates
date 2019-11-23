"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeBase_1 = require("./store/storeBase");
const diffSync_1 = require("./diff/diffSync");
class StoreSync extends storeBase_1.StoreBase {
    constructor(init, idFunction) {
        super(idFunction, init, new diffSync_1.DiffSync());
    }
}
exports.StoreSync = StoreSync;
//# sourceMappingURL=storeSync.js.map