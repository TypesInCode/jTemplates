import { Binding } from "./Binding/binding";
import { BindingConfig } from './Binding/bindingConfig';
import PropertyBinding from "./Binding/propertyBinding";
import DataBinding from "./Binding/dataBinding";
import TextBinding from "./Binding/textBinding";
import EventBinding from "./Binding/eventBinding";
import { BindingDefinitions, BindingDefinition, ComponentDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor } from './template.types';

export type BindingDefinitions<P, T> = BindingDefinitions<P, T>;
export type BindingDefinition<P, T> = BindingDefinition<P, T>;

export function TemplateFunction(type: string, templateDefinition?: TemplateDefinition<any>, children?: (c: any, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return {
        type: type,
        props: templateDefinition && templateDefinition.props,
        on: templateDefinition && templateDefinition.on,
        data: templateDefinition && templateDefinition.data,
        key: templateDefinition && templateDefinition.key,
        text: templateDefinition && templateDefinition.text,
        children: children,
    }
}

function ComponentFunction<P, T>(type: string, classType: TemplateConstructor<P, T>, componentDefinition?: ComponentDefinition<P, T>, templates?: Templates<T>): BindingDefinition<P, T> {
    return {
        type: type,
        class: classType,
        props: componentDefinition && componentDefinition.props,
        on: componentDefinition && componentDefinition.on,
        data: componentDefinition && componentDefinition.data,
        key: componentDefinition && componentDefinition.key,
        templates: templates,
    }
}

function CreateComponentFunction<P, T>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T> {
    return ComponentFunction.bind(null, type, classType) as BoundComponentFunction<P, T>;
}

function DefaultDataCallback() { return true; }
function BindTarget(bindingTarget: any, bindingDef: BindingDefinition<any, any>): Array<Binding<any>> {
    var ret: Array<Binding<any>> = [];
    var def1 = bindingDef as BindingDefinition<any, any>;
    if(def1.props)
        ret.push(new PropertyBinding(bindingTarget, def1.props));

    if(def1.on)
        ret.push(new EventBinding(bindingTarget, def1.on));

    if(def1.text)
        ret.push(new TextBinding(bindingTarget, def1.text));
    else if(def1.children) {
        def1.data = def1.data || DefaultDataCallback;
        ret.push(new DataBinding(bindingTarget, def1.data, def1.children, def1.key));
    }

    return ret;
}

export class Template<P, T> implements ITemplate<P, T> {
    private bindingDefinition: BindingDefinition<any, T>;
    private bindings: Array<Binding<any>>;
    private bindingRoot: any;
    private templates: Templates<T>;

    protected get DefaultTemplates(): Templates<T> {
        return {} as Templates<T>;
    }

    protected get Templates(): Templates<T> {
        return this.templates;
    }

    protected get Root(): any {
        return this.bindingRoot;
    }

    constructor(definition: BindingDefinition<P, T> | string) {
        if(typeof definition === 'string')
            definition = ComponentFunction(definition, this.constructor as TemplateConstructor<P, T>);
        
        this.templates = this.DefaultTemplates;
        this.SetTemplates(definition.templates);
        definition.children = definition.children || this.Template.bind(this);
        this.bindingDefinition = definition;
    }

    public SetTemplates(templates: Templates<T>) {
        if(!templates)
            return;
        
        for(var key in templates) {
            this.templates[key] = templates[key];
        }
    }

    public UpdateComplete(callback: () => void) {
        BindingConfig.updateComplete(callback);
    }

    public AttachTo(bindingParent: any) {
        if(!this.bindingRoot)
            this.BindRoot();

        BindingConfig.addChild(bindingParent, this.bindingRoot);
    }

    public AttachToContainer(container: any) {
        if(!this.bindingRoot)
            this.BindRoot();
        
        BindingConfig.addContainerChild(container, this.bindingRoot);
    }

    public AttachBefore(bindingParent: any, template: Template<any, any>) {
        if(!this.bindingRoot)
            this.BindRoot();

        BindingConfig.addChildBefore(bindingParent, template && template.bindingRoot, this.bindingRoot);
    }

    public AttachAfter(bindingParent: any, template: Template<any, any>) {
        if(!this.bindingRoot)
            this.BindRoot();
        
        BindingConfig.addChildAfter(bindingParent, template && template.bindingRoot, this.bindingRoot);
    }

    public Detach() {
        BindingConfig.remove(this.bindingRoot);
    }

    public Destroy() {
        this.Detach();
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy());
        this.bindings = [];
    }

    protected Template(c: P, i: number): BindingDefinitions<P, T> {
        return [];
    }

    private BindRoot() {
        this.bindingRoot = BindingConfig.createBindingTarget(this.bindingDefinition.type);
        this.bindings = BindTarget(this.bindingRoot, this.bindingDefinition);
    }
}

export namespace Template {
    export function ToFunction<P, T>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T> {
        return CreateComponentFunction(type, classType);
    }

    export function Create(bindingDef: BindingDefinition<any, any>): Template<any, any> {
        var constructor = (bindingDef.class || Template) as { new(bindingDef: BindingDefinition<any, any>): Template<any, any> };
        var template = new constructor(bindingDef);
        return template;
    }
}