"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeBinding_1 = require("./nodeBinding");
const bindingTemplate_1 = require("../bindingTemplate");
const browser_1 = require("../browser");
class DataBinding extends nodeBinding_1.default {
    constructor(boundTo, binding, rebind, children) {
        super(boundTo, binding);
        this.rebind = rebind;
        this.childTemplates = [];
        this.destroyedTemplates = [];
        if (typeof children != 'function')
            this.templateFunction = () => children;
        else
            this.templateFunction = children;
    }
    Update() {
        if (this.rebind) {
            this.destroyedTemplates = this.childTemplates;
            this.childTemplates = [];
        }
        var newValue = this.GetValue();
        if (newValue.length < this.childTemplates.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            for (var x = 0; x < oldComponents.length; x++) {
                if (this.destroyedTemplates.indexOf(oldComponents[x]) < 0)
                    this.destroyedTemplates.push(oldComponents[x]);
            }
        }
        super.Update();
    }
    Destroy() {
        for (var x = 0; x < this.childTemplates.length; x++)
            this.childTemplates[x].Destroy();
        super.Destroy();
    }
    Apply() {
        var currentLength = this.childTemplates.length;
        var newValue = this.GetValue();
        this.destroyedTemplates.forEach(c => c.Destroy());
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
    }
    GetValue() {
        var newValue = this.Value && this.Value.valueOf();
        if (!newValue)
            return [];
        if (!Array.isArray(newValue)) {
            return [newValue];
        }
        return newValue;
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map