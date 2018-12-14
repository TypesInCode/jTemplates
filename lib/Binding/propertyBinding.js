"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class PropertyBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {}, null);
    }
    Apply() {
        this.lastValue = this.lastValue || {};
        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
        this.lastValue = this.Value;
    }
    ApplyRecursive(target, lastValue, source) {
        if (typeof source !== "object")
            throw "Property binding must resolve to an object";
        for (var key in source) {
            var val = source[key];
            if (target[key] && val !== null && typeof val === 'object' && val.constructor === {}.constructor) {
                lastValue[key] = lastValue[key] || {};
                this.ApplyRecursive(target[key], lastValue[key], val);
            }
            else {
                val = val && val.valueOf();
                if (lastValue[key] !== val)
                    target[key] = val;
            }
        }
    }
}
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map