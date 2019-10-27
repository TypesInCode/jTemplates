"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class PropertyBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {});
    }
    Apply() {
        this.BoundTo.SetProperties(this.Value);
    }
}
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map