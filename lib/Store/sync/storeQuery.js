"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scopeBase");
const scope_1 = require("../scope");
class StoreQuery extends scopeBase_1.ScopeBase {
    constructor(store, getFunction) {
        super(getFunction, null);
        this.store = store;
    }
    Scope(callback) {
        return new scope_1.Scope(() => callback(this.Value));
    }
    UpdateValue(callback) {
        var reader = this.store.GetReader();
        var value = this.GetNewValue(reader);
        callback(reader.Emitters, value);
    }
}
exports.StoreQuery = StoreQuery;
//# sourceMappingURL=storeQuery.js.map