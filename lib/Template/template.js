"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bindingConfig_1 = require("./Binding/bindingConfig");
const propertyBinding_1 = require("./Binding/propertyBinding");
const dataBinding_1 = require("./Binding/dataBinding");
const textBinding_1 = require("./Binding/textBinding");
const eventBinding_1 = require("./Binding/eventBinding");
const scope_1 = require("../Store/scope/scope");
const injector_1 = require("../injector");
const store_1 = require("../Store/store/store");
function TemplateFunction(type, templateDefinition, children) {
    return {
        type: type,
        props: templateDefinition && templateDefinition.props,
        on: templateDefinition && templateDefinition.on,
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
        class: classType,
        props: componentDefinition && componentDefinition.props,
        on: componentDefinition && componentDefinition.on,
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
    if (def1.on)
        ret.push(new eventBinding_1.default(bindingTarget, def1.on));
    if (def1.text)
        ret.push(new textBinding_1.default(bindingTarget, def1.text));
    else if (def1.children) {
        def1.data = def1.data || def1.static || true;
        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children, def1.key));
    }
    return ret;
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
        this.destroyed = false;
        this.bindings = [];
        this.injector = new injector_1.Injector();
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
    get Store() {
        return this.Injector.Get(store_1.AbstractStore);
    }
    get Root() {
        if (!this.bindingRoot && !this.destroyed) {
            this.bindingRoot = bindingConfig_1.BindingConfig.createBindingTarget(this.definition.type);
            if (!this.deferBinding)
                injector_1.Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
            else
                bindingConfig_1.BindingConfig.scheduleUpdate(() => {
                    if (!this.destroyed)
                        injector_1.Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
                });
        }
        return this.bindingRoot;
    }
    SetTemplates(templates) {
        if (!templates)
            return;
        for (var key in templates) {
            this.templates[key] = templates[key];
        }
    }
    AttachTo(bindingParent) {
        bindingConfig_1.BindingConfig.addChild(bindingParent, this.Root);
    }
    AttachToContainer(container) {
        bindingConfig_1.BindingConfig.addContainerChild(container, this.Root);
    }
    AttachBefore(bindingParent, template) {
        bindingConfig_1.BindingConfig.addChildBefore(bindingParent, template && template.Root, this.Root);
    }
    AttachAfter(bindingParent, template) {
        bindingConfig_1.BindingConfig.addChildAfter(bindingParent, template && template.Root, this.Root);
    }
    Detach() {
        bindingConfig_1.BindingConfig.remove(this.Root);
    }
    Destroy(parentDestroyed = false) {
        if (!parentDestroyed)
            this.Detach();
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy(true));
        this.bindings = [];
        this.destroyed = true;
    }
    Template(c, i) {
        return [];
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
    function Create(bindingDef, deferBinding) {
        var constructor = (bindingDef.class || Template);
        var template = new constructor(bindingDef, deferBinding);
        return template;
    }
    Template.Create = Create;
})(Template = exports.Template || (exports.Template = {}));
//# sourceMappingURL=template.js.map