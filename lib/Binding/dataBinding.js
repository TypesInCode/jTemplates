"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const template_1 = require("../template");
const bindingConfig_1 = require("./bindingConfig");
function ConvertToArray(val) {
    if (!val)
        return [];
    if (!Array.isArray(val))
        return [val];
    return val;
}
class DataBinding extends binding_1.Binding {
    constructor(boundTo, bindingFunction, childrenFunction, keyFunction) {
        var bindingWrapper = null;
        if (typeof bindingFunction === 'function')
            bindingWrapper = () => {
                var value = bindingFunction();
                value = ConvertToArray(value);
                return value.map((curr, index) => {
                    return {
                        value: curr,
                        key: keyFunction && keyFunction(curr) || index
                    };
                });
            };
        else {
            bindingWrapper = ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: keyFunction && keyFunction(curr) || index
                };
            });
        }
        super(boundTo, bindingWrapper, { children: childrenFunction, key: keyFunction });
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap, true);
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
        var newTemplateMap = new Map();
        var newKeys = [];
        var container = bindingConfig_1.BindingConfig.createContainer();
        var previousTemplate = null;
        for (var x = 0; x < value.length; x++) {
            var newKey = value[x].key;
            newKeys.push(newKey);
            var newTemplates = this.activeTemplateMap.get(newKey);
            if (!newTemplates) {
                var newDefs = this.childrenFunction(value[x].value, x);
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
    DestroyTemplates(templateMap, isChild) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy(isChild)));
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map