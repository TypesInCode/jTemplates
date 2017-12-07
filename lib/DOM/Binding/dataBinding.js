"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require('./nodeBinding');
var bindingTemplate_1 = require("../bindingTemplate");
var browser_1 = require("../browser");
var DataBinding = (function (_super) {
    __extends(DataBinding, _super);
    function DataBinding(boundTo, binding, children) {
        _super.call(this, boundTo, binding);
        this.childTemplates = [];
        this.updatingTemplates = [];
        if (typeof children != 'function')
            this.templateFunction = function () { return children; };
        else
            this.templateFunction = children;
    }
    DataBinding.prototype.Destroy = function () {
        for (var x = 0; x < this.childTemplates.length; x++)
            this.childTemplates[x].Destroy();
    };
    DataBinding.prototype.Apply = function () {
        var currentLength = this.childTemplates.length;
        var newValue = this.Value;
        if (!newValue)
            newValue = [];
        else if (!Array.isArray(newValue))
            newValue = [newValue];
        if (currentLength > newValue.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            oldComponents.forEach(function (c) {
                c.Destroy();
            });
        }
        else if (currentLength < newValue.length) {
            var frag = browser_1.default.createDocumentFragment();
            for (var x = currentLength; x < newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new bindingTemplate_1.BindingTemplate(temp);
                newTemplate.AddListener("updating", this.TemplateUpdating.bind(this));
                newTemplate.AddListener("updated", this.TemplateUpdated.bind(this));
                newTemplate.AttachTo(frag);
                this.childTemplates.push(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }
    };
    DataBinding.prototype.Updated = function () {
        if (this.updatingTemplates.length == 0)
            _super.prototype.Updated.call(this);
    };
    DataBinding.prototype.TemplateUpdating = function (template) {
        var index = this.updatingTemplates.indexOf(template);
        if (index < 0)
            this.updatingTemplates.push(template);
        this.Updating();
    };
    DataBinding.prototype.TemplateUpdated = function (template) {
        var index = this.updatingTemplates.indexOf(template);
        if (index >= 0)
            this.updatingTemplates.splice(index, 1);
        this.Updated();
    };
    return DataBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map