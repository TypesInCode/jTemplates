"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var component_1 = require("../Component/component");
function CreateBindingFunction(binding, component) {
    var bindingFunc = binding;
    if (typeof bindingFunc != 'function')
        bindingFunc = function () { return binding; };
    var componentFunc = component;
    if (typeof componentFunc != 'function' || componentFunc.prototype instanceof component_1.default)
        componentFunc = function () { return component; };
    return function () {
        var b = bindingFunc();
        var c = componentFunc();
        return {
            value: b && b.valueOf(),
            component: c && c.valueOf()
        };
    };
}
function EnsureFunction(value) {
    if (typeof value == 'function')
        return value;
    return function () { return value; };
}
var ComponentBinding = (function (_super) {
    __extends(ComponentBinding, _super);
    function ComponentBinding(element, binding, compType, parentTemplates) {
        binding = binding && binding.valueOf();
        compType = compType && compType.valueOf();
        var newBinding = CreateBindingFunction(binding, compType);
        _super.call(this, element, newBinding);
        this.parentTemplates = {};
        for (var key in parentTemplates)
            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
    }
    ComponentBinding.prototype.Destroy = function () {
        this.component.Destroy();
    };
    ComponentBinding.prototype.Apply = function () {
        var component = this.Value.component;
        var value = this.Value.value;
        if (!component) {
            this.component.Destroy();
            return;
        }
        if (!this.component || !(this.component instanceof component)) {
            this.component && this.component.Destroy();
            this.component = new component();
            this.component.SetParentTemplates(this.parentTemplates);
        }
        this.component.SetParentData(this.Value.value);
        if (!this.component.Attached)
            this.component.AttachTo(this.BoundTo);
    };
    return ComponentBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentBinding;
//# sourceMappingURL=componentBinding.js.map