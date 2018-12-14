"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        super(boundTo, bindingFunction, [], { children: childrenFunction, key: keyFunction });
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }
    OverrideBinding(bindingFunction, config) {
        var localBinding = null;
        if (typeof bindingFunction === 'function') {
            localBinding = () => __awaiter(this, void 0, void 0, function* () {
                var value = yield bindingFunction();
                var array = ConvertToArray(value);
                return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr) || index
                    };
                });
            });
        }
        else
            localBinding = () => {
                var array = ConvertToArray(bindingFunction);
                return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr) || index
                    };
                });
            };
        return localBinding;
    }
    Init(config) {
        this.activeTemplateMap = new Map();
        this.activeKeys = [];
        this.childrenFunction = config.children;
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
    DestroyTemplates(templateMap) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map