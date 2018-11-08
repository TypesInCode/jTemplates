"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binding_1 = require("./binding");
const template_1 = require("../template");
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
        this.DestroyTemplates(this.activeTemplates);
        this.activeTemplates = [];
    }
    Init(childrenFunction) {
        this.activeTemplates = [];
        this.activeKeys = [];
        this.childrenFunction = childrenFunction;
    }
    Apply() {
        var value = this.Value;
        if (!value)
            value = [];
        else if (!Array.isArray(value))
            value = [value];
        var newKeys = [];
        var newTemplates = [];
        var activeIndex = 0;
        for (var x = 0; x < value.length; x++) {
            var newKey = this.keyFunction && this.keyFunction(value[x]);
            newKeys.push(newKey);
            if (newKey === this.activeKeys[activeIndex]) {
                newTemplates.push(this.activeTemplates[activeIndex]);
                activeIndex++;
            }
            else {
                var childDef = this.childrenFunction(value[x], x);
                if (!Array.isArray(childDef))
                    childDef = [childDef];
                var templates = childDef.filter(c => c).map(c => CreateTemplate(c));
                newTemplates.push(templates);
                var nextTemplate = this.activeTemplates[activeIndex + 1] && this.activeTemplates[activeIndex + 1][0];
                templates.forEach(t => t.AttachBefore(this.BoundTo, nextTemplate));
                newKeys.push(newKey);
            }
        }
        for (; activeIndex < this.activeTemplates.length; activeIndex++)
            newTemplates.push(this.activeTemplates[activeIndex]);
        if (newTemplates.length > value.length) {
            var destroyedTemplates = newTemplates.splice(value.length);
            this.DestroyTemplates(destroyedTemplates);
        }
        this.activeKeys = newKeys;
        this.activeTemplates = newTemplates;
    }
    DestroyTemplates(templates) {
        for (var x = 0; x < templates.length; x++)
            for (var y = 0; y < templates[x].length; y++)
                templates[x][y].Destroy();
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map