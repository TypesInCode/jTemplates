"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("../scope/scopeBase");
const scope_1 = require("../scope/scope");
class StoreQuery extends scopeBase_1.ScopeBase {
    constructor(store, defaultValue) {
        super(defaultValue);
        this.store = store;
    }
    get Store() {
        return this.store;
    }
    get Promise() {
        return new Promise((resolve, reject) => {
            if (this.HasValue)
                resolve(this.Value);
            else {
                var listener = () => {
                    resolve(this.Value);
                    this.removeListener("set", listener);
                };
                this.addListener("set", listener);
                this.UpdateValueBase();
            }
        });
    }
    Scope(callback) {
        return new scope_1.Scope(() => callback(this.Value));
    }
}
exports.StoreQuery = StoreQuery;
//# sourceMappingURL=storeQuery.js.map