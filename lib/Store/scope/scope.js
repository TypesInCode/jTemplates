"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scopeBase_1 = require("./scopeBase");
const scopeCollector_1 = require("./scopeCollector");
class Scope extends scopeBase_1.ScopeBase {
    constructor(getFunction) {
        if (typeof getFunction !== 'function')
            super(getFunction);
        else {
            super(null);
            this.getFunction = getFunction;
        }
    }
    Scope(callback) {
        return new Scope(() => callback(this.Value));
    }
    UpdateValue(callback) {
        var value = undefined;
        var emitters = scopeCollector_1.ScopeCollector.Watch(() => {
            if (this.getFunction)
                value = this.getFunction();
        });
        callback(emitters, value);
    }
}
exports.Scope = Scope;
//# sourceMappingURL=scope.js.map