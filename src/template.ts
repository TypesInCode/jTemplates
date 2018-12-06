import { Binding } from "./Binding/binding";
import { BindingConfig } from './Binding/bindingConfig';
import PropertyBinding from "./Binding/propertyBinding";
import DataBinding from "./Binding/dataBinding";
import TextBinding from "./Binding/textBinding";
import EventBinding from "./Binding/eventBinding";
import { BindingDefinitions, BindingDefinition, ComponentDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor } from './template.types';
import { Scope } from "./ObjectStore/objectStoreScope";

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
    private definition: BindingDefinition<P, T>;
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
        if(!this.bindingRoot) {
            this.bindingRoot = BindingConfig.createBindingTarget(this.definition.type);
            this.bindings = BindTarget(this.bindingRoot, this.definition);
        }
        
        return this.bindingRoot;
    }

    constructor(definition: BindingDefinition<P, T> | string) {
        if(typeof definition === 'string')
            definition = ComponentFunction(definition, this.constructor as TemplateConstructor<P, T>);
        
        this.templates = this.DefaultTemplates;
        this.SetTemplates(definition.templates);
        definition.children = definition.children || this.Template.bind(this);
        this.definition = definition;
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
        BindingConfig.addChild(bindingParent, this.Root);
    }

    public AttachToContainer(container: any) {
        BindingConfig.addContainerChild(container, this.Root);
    }

    public AttachBefore(bindingParent: any, template: Template<any, any>) {
        BindingConfig.addChildBefore(bindingParent, template && template.Root, this.Root);
    }

    public AttachAfter(bindingParent: any, template: Template<any, any>) {
        BindingConfig.addChildAfter(bindingParent, template && template.Root, this.Root);
    }

    public Detach() {
        BindingConfig.remove(this.Root);
    }

    public Destroy(isChild?: boolean) {
        if(!isChild)
            this.Detach();
        
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy());
        this.bindings = [];
    }

    protected Template(c: P, i: number): BindingDefinitions<P, T> {
        return [];
    }
}

export class Component<P, T> extends Template<Scope<P>, T> {
    constructor(definition: BindingDefinition<P, T> | string) {
        if(typeof definition === 'string')
            super(definition);
        else if(typeof definition.data === 'function') {
            (definition as any as BindingDefinition<Scope<P>, T>).data = new Scope(definition.data as ({(): P}));
            super(definition as any as BindingDefinition<Scope<P>, T>);
        }
        else {
            var data = definition.data;
            (definition as any as BindingDefinition<Scope<P>, T>).data = new Scope(() => data as P);
            super(definition as any as BindingDefinition<Scope<P> ,T>);
        }
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