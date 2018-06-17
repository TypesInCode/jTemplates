"use strict";
const nodeBinding_1 = require("./nodeBinding");
function EnsureFunction(value) {
    if (typeof value == 'function')
        return value;
    return () => value;
}
class ComponentBinding extends nodeBinding_1.default {
    constructor(element, binding, compType, parentTemplates) {
        super(element, binding);
        this.componentType = compType;
        this.parentTemplates = {};
        for (var key in parentTemplates)
            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
    }
    Destroy() {
        this.component.Destroy();
        super.Destroy();
    }
    Apply() {
        if (!this.component) {
            this.component = new this.componentType();
            this.component.SetParentTemplates(this.parentTemplates);
            this.component.SetParentData(this.Value);
            this.component.AttachTo(this.BoundTo);
        }
        else
            this.component.SetParentData(this.Value);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentBinding;
//# sourceMappingURL=componentBinding.js.map