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
        key: templateDefinition && templateDefinition.key,
        text: templateDefinition && templateDefinition.text,
        children: children,
        rebind: templateDefinition && templateDefinition.rebind
    };
}
exports.TemplateFunction = TemplateFunction;
function ComponentFunction(type, classType, componentDefinition, templates) {
    return {
        type: type,
        class: classType,
        props: componentDefinition && componentDefinition.props,
        on: componentDefinition && componentDefinition.on,
        data: componentDefinition && componentDefinition.data,
        key: componentDefinition && componentDefinition.key,
        templates: templates,
        rebind: componentDefinition && componentDefinition.rebind
    };
}
function CreateComponentFunction(type, classType) {
    return ComponentFunction.bind(null, type, classType);
}
function DefaultDataCallback() { return true; }
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
        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children, def1.rebind, def1.key));
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
    get Root() {
        return this.bindingRoot;
    }
    SetTemplates(templates) {
        if (!templates)
            return;
        for (var key in templates) {
            this.templates[key] = templates[key];
        }
    }
    UpdateComplete(callback) {
        bindingConfig_1.BindingConfig.updateComplete(callback);
    }
    AttachTo(bindingParent) {
        if (!this.bindingRoot)
            this.BindRoot();
        bindingConfig_1.BindingConfig.addChild(bindingParent, this.bindingRoot);
    }
    AttachToContainer(container) {
        if (!this.bindingRoot)
            this.BindRoot();
        bindingConfig_1.BindingConfig.addContainerChild(container, this.bindingRoot);
    }
    AttachBefore(bindingParent, template) {
        if (!this.bindingRoot)
            this.BindRoot();
        bindingConfig_1.BindingConfig.addChildBefore(bindingParent, template && template.bindingRoot, this.bindingRoot);
    }
    AttachAfter(bindingParent, template) {
        if (!this.bindingRoot)
            this.BindRoot();
        bindingConfig_1.BindingConfig.addChildAfter(bindingParent, template && template.bindingRoot, this.bindingRoot);
    }
    Detach() {
        bindingConfig_1.BindingConfig.remove(this.bindingRoot);
    }
    Destroy() {
        this.Detach();
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy());
        this.bindings = [];
    }
    Template(c, i) {
        return [];
    }
    BindRoot() {
        this.bindingRoot = bindingConfig_1.BindingConfig.createBindingTarget(this.bindingDefinition.type);
        this.bindings = BindTarget(this.bindingRoot, this.bindingDefinition);
    }
}
exports.Template = Template;
(function (Template) {
    function ToFunction(type, classType) {
        return CreateComponentFunction(type, classType);
    }
    Template.ToFunction = ToFunction;
})(Template = exports.Template || (exports.Template = {}));
//# sourceMappingURL=template.js.map