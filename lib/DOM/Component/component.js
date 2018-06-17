"use strict";
const bindingTemplate_1 = require("../bindingTemplate");
function CreateFunction(value) {
    return () => value;
}
class Component {
    constructor() {
        this.parentTemplates = this.DefaultTemplates;
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
    get Template() { }
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
            if (typeof parentTemplates[key] != 'function')
                this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
            else
                this.parentTemplates[key] = parentTemplates[key];
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Component;
//# sourceMappingURL=component.js.map