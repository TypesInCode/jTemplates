"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const bindingConfig_1 = require("./bindingConfig");
class TextBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, "", null);
    }
    Apply() {
        bindingConfig_1.BindingConfig.setText(this.BoundTo, this.Value);
    }
}
exports.default = TextBinding;
//# sourceMappingURL=textBinding.js.map