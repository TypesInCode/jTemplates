"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bindingConfig_1 = require("./Binding/bindingConfig");
const propertyBinding_1 = require("./Binding/propertyBinding");
const dataBinding_1 = require("./Binding/dataBinding");
const textBinding_1 = require("./Binding/textBinding");
const eventBinding_1 = require("./Binding/eventBinding");
function TemplateFunction(type, templateDefinition, children) {
    return {
        type: type,
        props: templateDefinition && templateDefinition.props,
        on: templateDefinition && templateDefinition.on,
        data: templateDefinition && templateDefinition.data,
        text: templateDefinition && templateDefinition.text,
        children: children
    };
}
function CreateTemplateFunction(type) {
    return TemplateFunction.bind(null, type);
}
exports.CreateTemplateFunction = CreateTemplateFunction;
function ComponentFunction(type, classType, componentDefinition, templates) {
    return {
        type: type,
        class: classType,
        props: componentDefinition && componentDefinition.props,
        on: componentDefinition && componentDefinition.on,
        data: componentDefinition && componentDefinition.data,
        templates: templates
    };
}
function CreateComponentFunction(type, classType) {
    return ComponentFunction.bind(null, type, classType);
}
exports.CreateComponentFunction = CreateComponentFunction;
function DefaultDataCallback() { return {}; }
function BindTarget(bindingTarget, bindingDef) {
    var ret = [];
    var def1 = bindingDef;
    if (def1.props)
        ret.push(new propertyBinding_1.default(bindingTarget, def1.props));
    if (def1.on)
        ret.push(new eventBinding_1.default(bindingTarget, def1.on));
    if (def1.text)
        ret.push(new textBinding_1.default(bindingTarget, def1.text));
    else if (def1.children) {
        def1.data = def1.data || DefaultDataCallback;
        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children));
    }
    return ret;
}
class Template {
    constructor(definition) {
        if (typeof definition === 'string')
            definition = ComponentFunction(definition, this.constructor);
        this.templates = this.DefaultTemplates;
        this.SetTemplates(definition.templates);
        definition.children = definition.children || this.Template.bind(this);
        this.bindingDefinition = definition;
    }
    get DefaultTemplates() {
        return {};
    }
    get Templates() {
        return this.templates;
    }
    SetTemplates(templates) {
        if (!templates)
            return;
        for (var key in templates) {
            this.templates[key] = templates[key];
        }
    }
    AttachTo(bindingParent) {
        if (!this.bindingRoot)
            this.BindRoot();
        this.Detach();
        this.bindingParent = bindingParent;
        bindingConfig_1.BindingConfig.addChild(bindingParent, this.bindingRoot);
    }
    Detach() {
        if (!this.bindingParent)
            return;
        bindingConfig_1.BindingConfig.removeChild(this.bindingParent, this.bindingRoot);
        this.bindingParent = null;
    }
    Destroy() {
        this.Detach();
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy());
        this.bindings = [];
    }
    Template(c, i) {
        return null;
    }
    BindRoot() {
        this.bindingRoot = bindingConfig_1.BindingConfig.createBindingTarget(this.bindingDefinition.type);
        this.bindings = BindTarget(this.bindingRoot, this.bindingDefinition);
    }
}
exports.Template = Template;
//# sourceMappingURL=template.js.map