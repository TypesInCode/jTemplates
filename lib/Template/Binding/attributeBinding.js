"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class AttributeBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {});
    }
    Apply() {
        this.BoundTo.SetAttributes(this.Value);
    }
}
exports.default = AttributeBinding;
//# sourceMappingURL=attributeBinding.js.map