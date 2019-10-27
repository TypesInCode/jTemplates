"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bindingConfig_1 = require("./Binding/bindingConfig");
const propertyBinding_1 = require("./Binding/propertyBinding");
const dataBinding_1 = require("./Binding/dataBinding");
const textBinding_1 = require("./Binding/textBinding");
const eventBinding_1 = require("./Binding/eventBinding");
const scope_1 = require("../Store/scope/scope");
const injector_1 = require("../injector");
const attributeBinding_1 = require("./Binding/attributeBinding");
const nodeRef_1 = require("./nodeRef");
function TemplateFunction(type, namespace, templateDefinition, children) {
    return {
        type: type,
        namespace: namespace,
        props: templateDefinition && templateDefinition.props,
        attrs: templateDefinition && templateDefinition.attrs,
        on: templateDefinition && templateDefinition.on,
        static: templateDefinition && templateDefinition.static,
        data: templateDefinition && templateDefinition.data,
        key: templateDefinition && templateDefinition.key,
        text: templateDefinition && templateDefinition.text,
        children: children,
    };
}
exports.TemplateFunction = TemplateFunction;
function ComponentFunction(type, classType, componentDefinition, templates) {
    return {
        type: type,
        namespace: null,
        class: classType,
        props: componentDefinition && componentDefinition.props,
        attrs: componentDefinition && componentDefinition.attrs,
        on: componentDefinition && componentDefinition.on,
        static: componentDefinition && componentDefinition.static,
        data: componentDefinition && componentDefinition.data,
        key: componentDefinition && componentDefinition.key,
        templates: templates,
    };
}
function CreateComponentFunction(type, classType) {
    return ComponentFunction.bind(null, type, classType);
}
function BindTarget(bindingTarget, bindingDef) {
    var ret = [];
    var def1 = bindingDef;
    if (def1.props)
        ret.push(new propertyBinding_1.default(bindingTarget, def1.props));
    if (def1.attrs)
        ret.push(new attributeBinding_1.default(bindingTarget, def1.attrs));
    if (def1.on)
        ret.push(new eventBinding_1.default(bindingTarget, def1.on));
    if (def1.text)
        ret.push(new textBinding_1.default(bindingTarget, def1.text));
    return ret;
}
function DataBindTarget(bindingTarget, bindingDef) {
    if (bindingDef.children)
        return new dataBinding_1.default(bindingTarget, bindingDef.data || bindingDef.static || true, bindingDef.children, bindingDef.key);
    return null;
}
class Template {
    constructor(definition, deferBinding = false) {
        this.deferBinding = deferBinding;
        if (typeof definition === 'string')
            definition = ComponentFunction(definition, this.constructor);
        this.templates = this.DefaultTemplates;
        this.SetTemplates(definition.templates);
        definition.children = definition.children || this.Template.bind(this);
        this.definition = definition;
        this.bindingRoot = new nodeRef_1.NodeRef(this.definition.type, this.definition.namespace);
        this.dataBound = false;
        this.injector = new injector_1.Injector();
        this.Init();
    }
    get Root() {
        if (!this.dataBound) {
            injector_1.Injector.Scope(this.injector, () => this.dataBinding = DataBindTarget(this.bindingRoot, this.definition));
            this.dataBound = true;
        }
        return this.bindingRoot;
    }
    get DefaultTemplates() {
        return {};
    }
    get Templates() {
        return this.templates;
    }
    get Injector() {
        return this.injector;
    }
    SetTemplates(templates) {
        if (!templates)
            return;
        for (var key in templates) {
            this.templates[key] = templates[key];
        }
    }
    BindTemplate() {
        if (!this.deferBinding) {
            injector_1.Injector.Scope(this.injector, () => this.bindings = BindTarget(this.Root, this.definition));
            this.Bound();
        }
        else {
            bindingConfig_1.BindingConfig.scheduleUpdate(() => {
                injector_1.Injector.Scope(this.injector, () => this.bindings = BindTarget(this.Root, this.definition));
                this.Bound();
            });
        }
    }
    AttachTo(parent) {
        if (!(parent instanceof nodeRef_1.NodeRef))
            parent = new nodeRef_1.NodeRef(parent);
        parent.AddChild(this.Root);
    }
    AttachAfter(rootParent, template) {
        rootParent.AddChildAfter(template && template.Root, this.Root);
    }
    Detach() {
        this.Root.Detach();
    }
    Destroy() {
        this.Detach();
        this.bindingRoot = null;
        this.dataBinding && this.dataBinding.Destroy();
        this.dataBinding = null;
        this.bindings && this.bindings.forEach(b => b.Destroy());
        this.bindings = null;
    }
    Template(c, i) {
        return [];
    }
    Init() {
    }
    Bound() {
    }
}
exports.Template = Template;
class Component extends Template {
    constructor(definition, deferBinding = false) {
        if (typeof definition === 'string')
            super(definition, deferBinding);
        else {
            if (definition.data) {
                definition.data = new scope_1.Scope(definition.data);
                super(definition, deferBinding);
            }
            else {
                var data = definition.static;
                definition.data = new scope_1.Scope(() => data);
                super(definition, deferBinding);
            }
        }
    }
}
exports.Component = Component;
(function (Template) {
    function ToFunction(type, classType) {
        return CreateComponentFunction(type, classType);
    }
    Template.ToFunction = ToFunction;
    function Create(def, deferBinding) {
        var localDef = {};
        for (var key in def)
            localDef[key] = def[key];
        var constructor = (localDef.class || Template);
        var template = new constructor(localDef, deferBinding);
        return template;
    }
    Template.Create = Create;
})(Template = exports.Template || (exports.Template = {}));
//# sourceMappingURL=template.js.map