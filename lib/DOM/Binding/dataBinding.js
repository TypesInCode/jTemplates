"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require('./nodeBinding');
var bindingTemplate_1 = require("../bindingTemplate");
var browser_1 = require("../browser");
var observable_1 = require('../../Observable/observable');
var DataBinding = (function (_super) {
    __extends(DataBinding, _super);
    function DataBinding(boundTo, binding, children) {
        _super.call(this, boundTo, binding);
        this.childTemplates = [];
        this.destroyedTemplates = [];
        if (typeof children != 'function')
            this.templateFunction = function () { return children; };
        else
            this.templateFunction = children;
    }
    DataBinding.prototype.Update = function () {
        var newValue = this.GetValue();
        if (newValue.length < this.childTemplates.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            for (var x = 0; x < oldComponents.length; x++) {
                if (this.destroyedTemplates.indexOf(oldComponents[x]) < 0)
                    this.destroyedTemplates.push(oldComponents[x]);
            }
        }
        _super.prototype.Update.call(this);
    };
    DataBinding.prototype.Destroy = function () {
        for (var x = 0; x < this.childTemplates.length; x++)
            this.childTemplates[x].Destroy();
        _super.prototype.Destroy.call(this);
    };
    DataBinding.prototype.Apply = function () {
        var currentLength = this.childTemplates.length;
        var newValue = this.GetValue();
        this.destroyedTemplates.forEach(function (c) { return c.Destroy(); });
        if (currentLength < newValue.length) {
            var frag = browser_1.default.createDocumentFragment();
            for (var x = currentLength; x < newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new bindingTemplate_1.BindingTemplate(temp);
                newTemplate.AttachTo(frag);
                this.childTemplates.push(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }
        this.destroyedTemplates = [];
    };
    DataBinding.prototype.GetValue = function () {
        var newValue = this.Value;
        if (newValue instanceof observable_1.default)
            newValue = newValue.valueOf();
        if (!Array.isArray(newValue))
            newValue = [newValue];
        return newValue;
    };
    return DataBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map