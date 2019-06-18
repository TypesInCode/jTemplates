"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store/store");
const diffSync_1 = require("./diff/diffSync");
class StoreSync extends store_1.Store {
    constructor(idFunction, init) {
        super(idFunction, init, new diffSync_1.DiffSync());
    }
}
exports.StoreSync = StoreSync;
//# sourceMappingURL=storeSync.js.map