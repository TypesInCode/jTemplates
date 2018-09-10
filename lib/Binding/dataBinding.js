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
    constructor(boundTo, bindingFunction, childrenFunction) {
        super(boundTo, bindingFunction, childrenFunction);
    }
    Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplates);
        this.activeTemplates = [];
    }
    Init(childrenFunction) {
        this.activeTemplates = [];
        this.childrenFunction = childrenFunction;
    }
    Apply() {
        this.activeTemplates = this.activeTemplates || [];
        var value = this.Value;
        if (!value)
            value = [];
        else if (!Array.isArray(value))
            value = [value];
        if (this.activeTemplates.length < value.length) {
            for (var x = this.activeTemplates.length; x < value.length; x++) {
                var childDef = this.childrenFunction(value[x], x);
                if (!Array.isArray(childDef))
                    childDef = [childDef];
                var templates = childDef.filter(c => c).map(c => CreateTemplate(c));
                this.activeTemplates[x] = templates;
                templates.forEach(t => t.AttachTo(this.BoundTo));
            }
        }
        else {
            var destroyedTemplates = this.activeTemplates.splice(value.length);
            this.DestroyTemplates(destroyedTemplates);
        }
    }
    DestroyTemplates(templates) {
        for (var x = 0; x < templates.length; x++)
            for (var y = 0; y < templates[x].length; y++)
                templates[x][y].Destroy();
    }
}
exports.default = DataBinding;
//# sourceMappingURL=dataBinding.js.map