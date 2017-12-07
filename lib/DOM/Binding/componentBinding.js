"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
function EnsureFunction(value) {
    if (typeof value == 'function')
        return value;
    return function () { return value; };
}
var ComponentBinding = (function (_super) {
    __extends(ComponentBinding, _super);
    function ComponentBinding(element, binding, compType, parentTemplates) {
        _super.call(this, element, binding);
        this.componentType = compType;
        this.parentTemplates = {};
        for (var key in parentTemplates)
            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
    }
    ComponentBinding.prototype.Destroy = function () {
        this.component.Destroy();
    };
    ComponentBinding.prototype.Apply = function () {
        if (!this.component) {
            this.component = new this.componentType();
            this.component.SetParentTemplates(this.parentTemplates);
            this.component.AttachTo(this.BoundTo);
        }
        this.component.SetParentData(this.Value);
    };
    return ComponentBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentBinding;
//# sourceMappingURL=componentBinding.js.map