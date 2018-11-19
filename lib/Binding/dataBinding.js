"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const template_1 = require("../template");
const bindingConfig_1 = require("./bindingConfig");
function CreateTemplate(bindingDef) {
    var constructor = (bindingDef.class || template_1.Template);
    var template = new constructor(bindingDef);
    return template;
}
class DataBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction, childrenFunction, rebind, keyFunction) {
        super(boundTo, bindingFunction, childrenFunction);
        this.rebind = rebind;
        this.keyFunction = keyFunction;
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }
    Init(childrenFunction) {
        this.activeTemplateMap = new Map();
        this.activeKeys = [];
        this.childrenFunction = childrenFunction;
    }
    Apply() {
        var value = this.Value;
        if (!value)
            value = [];
        else if (!Array.isArray(value))
            value = [value];
        var newTemplateMap = new Map();
        var newKeys = [];
        var container = bindingConfig_1.BindingConfig.createContainer();
        for (var x = 0; x < value.length; x++) {
            var newKey = this.keyFunction && this.keyFunction(value[x]) || x;
            newKeys.push(newKey);
            var newTemplates = this.activeTemplateMap.get(newKey);
            if (!newTemplates) {
                var newDefs = this.childrenFunction(value[x], x);
                if (!Array.isArray(newDefs))
                    newDefs = [newDefs];
                newTemplates = newDefs.filter(d => d).map(d => CreateTemplate(d));
            }
            newTemplateMap.set(newKey, newTemplates);
            this.activeTemplateMap.delete(newKey);
            if (x >= this.activeKeys.length) {
                newTemplates.forEach(t => t.AttachToContainer(container));
            }
            else if (newKey !== this.activeKeys[x]) {
                var nextTemplates = this.activeTemplateMap.get(this.activeKeys[x + 1]);
                var nextTemplate = nextTemplates && nextTemplates[0];
                newTemplates.forEach(t => t.AttachBefore(this.BoundTo, nextTemplate));
            }
        }
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = newTemplateMap;
        this.activeKeys = newKeys;
        bindingConfig_1.BindingConfig.addChildContainer(this.BoundTo, container);
    }
    DestroyTemplates(templateMap) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map