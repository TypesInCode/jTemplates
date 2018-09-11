"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class PropertyBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, null);
    }
    Apply() {
        this.ApplyRecursive(this.BoundTo, this.Value);
    }
    ApplyRecursive(target, source) {
        if (typeof source !== "object")
            throw "Property binding must resolve to an object";
        for (var key in source) {
            var val = source[key];
            if (val !== null && typeof val === 'object' && val.constructor === {}.constructor) {
                target[key] = target[key] || {};
                this.ApplyRecursive(target[key], val);
            }
            else {
                val = val && val.valueOf();
                if (target[key] !== val)
                    target[key] = val;
            }
        }
    }
}
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map