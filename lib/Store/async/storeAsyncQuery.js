"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scopeBase");
const scope_1 = require("../scope");
class StoreAsyncQuery extends scopeBase_1.ScopeBase {
    constructor(store, getFunction, defaultValue) {
        super(getFunction, defaultValue);
        this.store = store;
    }
    Scope(callback) {
        return new scope_1.Scope(() => callback(this.Value));
    }
    UpdateValue(callback) {
        var reader = this.store.GetReader();
        this.GetNewValue(reader).then(value => {
            callback(reader.Emitters, value);
        });
    }
}
exports.StoreAsyncQuery = StoreAsyncQuery;
//# sourceMappingURL=storeAsyncQuery.js.map