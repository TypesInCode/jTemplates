"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bindingTemplate_1 = require("../bindingTemplate");
function CreateFunction(value) {
    if (typeof value != 'function')
        return () => value;
    return value;
}
class Component {
    constructor() {
        this.parentTemplates = {};
        for (var key in this.DefaultTemplates)
            this.parentTemplates[key] = this.DefaultTemplates[key];
    }
    get BindingTemplate() {
        if (!this.bindingTemplate) {
            this.bindingTemplate = new bindingTemplate_1.BindingTemplate(this.Template);
        }
        return this.bindingTemplate;
    }
    static get Name() {
        throw "public static property Name must be overidden";
    }
    get DefaultTemplates() {
        return {};
    }
    get Templates() {
        return this.parentTemplates;
    }
    get Attached() {
        return this.BindingTemplate.Attached;
    }
    get AttachedTo() {
        return this.BindingTemplate.AttachedTo;
    }
    SetParentData(data) { }
    SetParentTemplates(parentTemplates) {
        for (var key in parentTemplates) {
            this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
        }
    }
    AttachTo(element) {
        this.BindingTemplate.AttachTo(element);
    }
    Detach() {
        this.BindingTemplate.Detach();
    }
    Destroy() {
        this.BindingTemplate.Destroy();
    }
}
exports.default = Component;
//# sourceMappingURL=component.js.map