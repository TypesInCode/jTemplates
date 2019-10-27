"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
class TextBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction) {
        super(boundTo, bindingFunction, "");
    }
    Apply() {
        this.BoundTo.SetText(this.Value);
    }
}
exports.default = TextBinding;
//# sourceMappingURL=textBinding.js.map