"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const template_1 = require("../template");
const injector_1 = require("../../injector");
function ConvertToArray(val) {
    if (!val)
        return [];
    if (!Array.isArray(val))
        return [val];
    return val;
}
class DataBinding extends binding_1.Binding {
    get SynchInit() {
        return true;
    }
    constructor(boundTo, bindingFunction, childrenFunction, keyFunction) {
        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }
    OverrideBinding(bindingFunction, config) {
        var binding = null;
        if (typeof bindingFunction === 'function') {
            binding = () => {
                var value = bindingFunction();
                var array = ConvertToArray(value);
                var ret = array.map((val, index) => ({
                    value: val,
                    key: config.key && config.key(val)
                }));
                return ret;
            };
        }
        else if (config.key) {
            binding = () => ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: config.key && config.key(curr)
                };
            });
        }
        else {
            binding = ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: config.key && config.key(curr)
                };
            });
        }
        return binding;
    }
    Init(config) {
        this.activeTemplateMap = new Map();
        this.keyFunction = config.key;
        var children = config.children;
        if (typeof children !== 'function')
            children = () => config.children;
        this.childrenFunction = children;
    }
    Apply() {
        var value = this.Value;
        var newTemplateMap = new Map();
        var currentRowCount = this.activeTemplateMap.size;
        for (var x = 0; x < value.length; x++) {
            var newKey = value[x].key || x;
            newTemplateMap.set(newKey, this.activeTemplateMap.get(newKey));
            this.activeTemplateMap.delete(newKey);
        }
        this.DestroyTemplates(this.activeTemplateMap);
        var previousTemplate = null;
        var index = 0;
        var newNodeRefs = [];
        var newTemplates = [];
        newTemplateMap.forEach((templates, key) => {
            if (!templates) {
                var newDefs = this.childrenFunction(value[index].value, index);
                if (!Array.isArray(newDefs))
                    newDefs = [newDefs];
                injector_1.Injector.Scope(this.Injector, () => {
                    templates = newDefs.map(d => template_1.Template.Create(d, !this.IsStatic));
                });
                newTemplateMap.set(key, templates);
            }
            if (index < (currentRowCount - this.activeTemplateMap.size)) {
                templates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            }
            else
                templates.forEach(t => {
                    newTemplates.push(t);
                    newNodeRefs.push(t.Root);
                });
            index++;
        });
        this.activeTemplateMap = newTemplateMap;
        this.BoundTo.AddChildren(newNodeRefs);
        for (var x = 0; x < newTemplates.length; x++)
            newTemplates[x].BindTemplate();
    }
    DestroyTemplates(templateMap) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map