"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("./scopeBase");
const scopeCollector_1 = require("./scopeCollector");
class Scope extends scopeBase_1.ScopeBase {
    constructor(getFunction) {
        super(getFunction, null);
    }
    Scope(callback) {
        return new Scope(() => callback(this.Value));
    }
    UpdateValue(callback) {
        var value = null;
        var emitters = scopeCollector_1.scopeCollector.Watch(() => {
            value = this.GetNewValue();
        });
        callback(emitters, value);
    }
}
exports.Scope = Scope;
//# sourceMappingURL=scope.js.map