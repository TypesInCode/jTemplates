"use strict";
var bindings_1 = require("../Binding/bindings");
var template_1 = require("../template");
var ComponentBase = (function () {
    function ComponentBase() {
        this.destroyed = false;
        this.bound = false;
    }
    Object.defineProperty(ComponentBase.prototype, "Attached", {
        get: function () {
            return this.template.Attached;
        },
        enumerable: true,
        configurable: true
    });
    ComponentBase.prototype.AttachTo = function (element) {
        if (this.destroyed)
            throw "Can't attach destroyed component";
        if (!this.bound) {
            this.bindings = bindings_1.default.Bind(this.template.DocumentFragment, this.BindingParameters());
            this.bindings.forEach(function (c) { return c.Update(); });
            this.bound = true;
        }
        this.template.AttachTo(element);
    };
    ComponentBase.prototype.Detach = function () {
        this.template.Detach();
    };
    ComponentBase.prototype.Destroy = function () {
        this.Detach();
        this.bindings.forEach(function (c) {
            c.Destroy();
        });
        this.destroyed = true;
    };
    ComponentBase.prototype.SetChildElements = function (fragments) {
        if (this.bound)
            throw "Child elements can't be set after component is bound";
        this.template.OverwriteChildElements(fragments);
    };
    ComponentBase.prototype.SetTemplate = function (template) {
        this.template = template_1.default.Create(template);
    };
    ComponentBase.prototype.BindingParameters = function () {
        return {
            $comp: this
        };
    };
    return ComponentBase;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentBase;
//# sourceMappingURL=componentBase.js.map