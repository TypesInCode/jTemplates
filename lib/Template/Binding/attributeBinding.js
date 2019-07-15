"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const bindingConfig_1 = require("./bindingConfig");
class AttributeBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, {});
    }
    Apply() {
        var value = this.Value;
        for (var key in value) {
            var val = bindingConfig_1.BindingConfig.getAttribute(this.BoundTo, key);
            if (val !== value[key])
                bindingConfig_1.BindingConfig.setAttribute(this.BoundTo, key, value[key]);
        }
    }
}
exports.default = AttributeBinding;
//# sourceMappingURL=attributeBinding.js.map