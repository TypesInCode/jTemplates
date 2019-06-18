"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scope/scopeBase");
const storeReader_1 = require("./storeReader");
const storeWriter_1 = require("./storeWriter");
const scope_1 = require("../scope/scope");
class StoreQuery extends scopeBase_1.ScopeBase {
    constructor(store, defaultValue, getFunction) {
        super(getFunction, defaultValue);
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
        this.GetFunction(this.reader, this.writer).then(value => {
            this.reader.Watching = false;
            callback(this.reader.Emitters, value);
        });
    }
}
exports.StoreQuery = StoreQuery;
//# sourceMappingURL=storeQuery.js.map