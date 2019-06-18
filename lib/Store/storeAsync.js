"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store/store");
const diffAsync_1 = require("./diff/diffAsync");
class StoreAsync extends store_1.Store {
    constructor(idFunction, init) {
        super(idFunction, init, new diffAsync_1.DiffAsync());
    }
}
exports.StoreAsync = StoreAsync;
//# sourceMappingURL=storeAsync.js.map