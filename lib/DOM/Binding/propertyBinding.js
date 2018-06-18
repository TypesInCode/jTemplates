"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeBinding_1 = require("./nodeBinding");
class PropertyBinding extends nodeBinding_1.default {
    constructor(boundTo, propertyPath, bindingFunction) {
        super(boundTo, bindingFunction);
        this.parentObject = this.BoundTo;
        var x = 0;
        for (; x < propertyPath.length - 1; x++)
            this.parentObject = this.parentObject[propertyPath[x]];
        this.propName = propertyPath[x];
    }
    Apply() {
        this.parentObject[this.propName] = this.Value && this.Value.valueOf();
    }
}
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map