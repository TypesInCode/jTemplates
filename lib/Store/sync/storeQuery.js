"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scopeBase");
const storeReader_1 = require("./storeReader");
const scope_1 = require("../scope");
const storeWriter_1 = require("./storeWriter");
class StoreQuery extends scopeBase_1.ScopeBase {
    constructor(store, getFunction) {
        super(getFunction, null);
        this.reader = new storeReader_1.StoreReader(store);
        this.writer = new storeWriter_1.StoreWriter(store);
    }
    Scope(callback) {
        return new scope_1.Scope(() => callback(this.Value));
    }
    Destroy() {
        super.Destroy();
        this.reader.Destroy();
    }
    UpdateValue(callback) {
        this.reader.Watching = true;
        var value = this.GetFunction(this.reader, this.writer);
        this.reader.Watching = false;
        callback(this.reader.Emitters, value);
    }
}
exports.StoreQuery = StoreQuery;
//# sourceMappingURL=storeQuery.js.map