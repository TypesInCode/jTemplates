"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeQuery_1 = require("./storeQuery");
class StoreQuerySync extends storeQuery_1.StoreQuery {
    constructor(store, defaultValue, getFunction) {
        super(store, defaultValue);
        this.getFunction = getFunction;
    }
    UpdateValue(callback) {
        var value = null;
        var emitters = null;
        this.Store.ActionSync(reader => {
            reader.Watching = true;
            value = this.getFunction(reader);
            reader.Watching = false;
            emitters = reader.Emitters;
        });
        callback(emitters, value);
    }
}
exports.StoreQuerySync = StoreQuerySync;
//# sourceMappingURL=storeQuerySync.js.map