"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeBase_1 = require("./store/storeBase");
const diffAsync_1 = require("./diff/diffAsync");
class StoreAsync extends storeBase_1.StoreBase {
    constructor(init, idFunction) {
        super(idFunction, init, new diffAsync_1.DiffAsync());
    }
}
exports.StoreAsync = StoreAsync;
//# sourceMappingURL=storeAsync.js.map