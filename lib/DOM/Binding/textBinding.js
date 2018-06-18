"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeBinding_1 = require("./nodeBinding");
class TextBinding extends nodeBinding_1.default {
    constructor(element, binding) {
        super(element, binding);
    }
    Apply() {
        this.BoundTo.textContent = this.Value;
    }
}
exports.default = TextBinding;
//# sourceMappingURL=textBinding.js.map