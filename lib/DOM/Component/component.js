"use strict";
var bindingTemplate_1 = require("../bindingTemplate");
function CreateFunction(value) {
    return function () { return value; };
}
var Component = (function () {
    function Component() {
        this.parentTemplates = this.DefaultTemplates;
    }
    Object.defineProperty(Component.prototype, "BindingTemplate", {
        get: function () {
            if (!this.bindingTemplate) {
                this.bindingTemplate = new bindingTemplate_1.BindingTemplate(this.Template);
            }
            return this.bindingTemplate;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component, "Name", {
        get: function () {
            throw "public static property Name must be overidden";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component.prototype, "Template", {
        get: function () { },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component.prototype, "DefaultTemplates", {
        get: function () {
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component.prototype, "Templates", {
        get: function () {
            return this.parentTemplates;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component.prototype, "Attached", {
        get: function () {
            return this.BindingTemplate.Attached;
        },
        enumerable: true,
        configurable: true
    });
    Component.prototype.SetParentData = function (data) { };
    Component.prototype.SetParentTemplates = function (parentTemplates) {
        for (var key in parentTemplates) {
            if (typeof parentTemplates[key] != 'function')
                this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
            else
                this.parentTemplates[key] = parentTemplates[key];
        }
    };
    Component.prototype.AttachTo = function (element) {
        this.BindingTemplate.AttachTo(element);
    };
    Component.prototype.Detach = function () {
        this.BindingTemplate.Detach();
    };
    Component.prototype.Destroy = function () {
        this.BindingTemplate.Destroy();
    };
    return Component;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Component;
//# sourceMappingURL=component.js.map