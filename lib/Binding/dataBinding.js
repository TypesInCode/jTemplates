"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const template_1 = require("../template");
const bindingConfig_1 = require("./bindingConfig");
class DataBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction, childrenFunction, keyFunction) {
        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }
    Init(config) {
        this.activeTemplateMap = new Map();
        this.activeKeys = [];
        this.childrenFunction = config.children;
        this.keyFunction = config.key;
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
        var previousTemplate = null;
        for (var x = 0; x < value.length; x++) {
            var newKey = this.keyFunction && this.keyFunction(value[x]) || x;
            newKeys.push(newKey);
            var newTemplates = this.activeTemplateMap.get(newKey);
            if (!newTemplates) {
                var newDefs = this.childrenFunction(value[x], x);
                if (!Array.isArray(newDefs))
                    newDefs = [newDefs];
                newTemplates = newDefs.map(d => template_1.Template.Create(d));
            }
            newTemplateMap.set(newKey, newTemplates);
            this.activeTemplateMap.delete(newKey);
            if (x >= this.activeKeys.length)
                newTemplates.forEach(t => {
                    t.AttachToContainer(container);
                    previousTemplate = t;
                });
            else if (newKey !== this.activeKeys[x])
                newTemplates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            else
                previousTemplate = newTemplates[newTemplates.length - 1] || previousTemplate;
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