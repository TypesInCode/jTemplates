"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeBinding_1 = require("./nodeBinding");
const bindingTemplate_1 = require("../bindingTemplate");
const browser_1 = require("../browser");
class DataBinding extends nodeBinding_1.default {
    constructor(boundTo, binding, rebind, children) {
        super(boundTo, binding);
        this.rebind = rebind;
        this.childTemplates = new Set();
        this.destroyedTemplates = new Set();
        if (typeof children != 'function')
            this.templateFunction = () => children;
        else
            this.templateFunction = children;
    }
    Update() {
        if (this.rebind) {
            this.childTemplates.forEach(t => !this.destroyedTemplates.has(t) && this.destroyedTemplates.add(t));
            this.childTemplates.clear();
        }
        var childTemplates = [...this.childTemplates];
        var newValue = this.GetValue();
        if (newValue.length < childTemplates.length) {
            var oldComponents = childTemplates.splice(newValue.length);
            for (var x = 0; x < oldComponents.length; x++) {
                if (!this.destroyedTemplates.has(oldComponents[x]))
                    this.destroyedTemplates.add(oldComponents[x]);
            }
            this.childTemplates = new Set(childTemplates);
        }
        super.Update();
    }
    Destroy() {
        this.childTemplates.forEach(t => t.Destroy());
        super.Destroy();
    }
    Apply() {
        var currentLength = this.childTemplates.size;
        var newValue = this.GetValue();
        this.destroyedTemplates.forEach(c => c.Destroy());
        if (currentLength < newValue.length) {
            var frag = browser_1.default.createDocumentFragment();
            for (var x = currentLength; x < newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new bindingTemplate_1.BindingTemplate(temp);
                newTemplate.AttachTo(frag);
                this.childTemplates.add(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }
        this.destroyedTemplates.clear();
    }
    GetValue() {
        var newValue = this.Value;
        var valueOf = newValue && newValue.valueOf();
        if (!valueOf)
            return [];
        if (!Array.isArray(valueOf)) {
            return [newValue];
        }
        return newValue;
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map