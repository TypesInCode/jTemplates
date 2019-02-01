"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scopeBase");
const storeAsyncReader_1 = require("./storeAsyncReader");
const storeAsyncWriter_1 = require("./storeAsyncWriter");
const scope_1 = require("../scope");
class StoreAsyncQuery extends scopeBase_1.ScopeBase {
    constructor(store, defaultValue, getFunction) {
        super(getFunction, defaultValue);
        this.reader = new storeAsyncReader_1.StoreAsyncReader(store);
        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(store);
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
exports.StoreAsyncQuery = StoreAsyncQuery;
//# sourceMappingURL=storeAsyncQuery.js.map