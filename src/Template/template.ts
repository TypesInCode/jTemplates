import { Binding } from "./Binding/binding";
import { BindingConfig } from './Binding/bindingConfig';
import PropertyBinding from "./Binding/propertyBinding";
import DataBinding from "./Binding/dataBinding";
import TextBinding from "./Binding/textBinding";
import EventBinding from "./Binding/eventBinding";
import { BindingDefinitions, BindingDefinition, ComponentDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor, ChildrenOr } from './template.types';
import { Scope } from "../Store/scope/scope";
import { Injector } from "../injector";
import { AbstractStore } from "../Store/store/store";

export function TemplateFunction(type: string, templateDefinition?: TemplateDefinition<any>, children?: ChildrenOr<any>): BindingDefinition<any, any> {
    return {
        type: type,
        props: templateDefinition && templateDefinition.props,
        on: templateDefinition && templateDefinition.on,
        static: templateDefinition && templateDefinition.static,
        data: templateDefinition && templateDefinition.data,
        key: templateDefinition && templateDefinition.key,
        text: templateDefinition && templateDefinition.text,
        children: children,
    }
}

function ComponentFunction<P, T extends Templates>(type: string, classType: TemplateConstructor<P, T>, componentDefinition?: ComponentDefinition<P, T>, templates?: T): BindingDefinition<P, T> {
    return {
        type: type,
        class: classType,
        props: componentDefinition && componentDefinition.props,
        on: componentDefinition && componentDefinition.on,
        static: componentDefinition && componentDefinition.static,
        data: componentDefinition && componentDefinition.data,
        key: componentDefinition && componentDefinition.key,
        templates: templates,
    }
}

function CreateComponentFunction<P, T extends Templates>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T> {
    return ComponentFunction.bind(null, type, classType) as BoundComponentFunction<P, T>;
}

// function DefaultDataCallback() { return true; }
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
        def1.data = def1.data || def1.static || true; //DefaultDataCallback;
        ret.push(new DataBinding(bindingTarget, def1.data, def1.children, def1.key));
    }

    return ret;
}

export class Template<P, T extends Templates> implements ITemplate<P, T> {
    private definition: BindingDefinition<P, T>;
    private bindings: Array<Binding<any>>;
    private bindingRoot: any;
    private templates: T;
    private destroyed: boolean;
    private injector: Injector;

    protected get DefaultTemplates(): T {
        return {} as T;
    }

    protected get Templates(): T {
        return this.templates;
    }

    protected get Injector(): Injector {
        return this.injector;
    }

    protected get Store(): AbstractStore {
        return this.Injector.Get(AbstractStore);
    }

    protected get Root(): any {
        if(!this.bindingRoot && !this.destroyed) {
            this.bindingRoot = BindingConfig.createBindingTarget(this.definition.type);
            if(!this.deferBinding)
                Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
            else
                BindingConfig.scheduleUpdate(() => {
                    if(!this.destroyed)
                        Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
                });
        }
        
        return this.bindingRoot;
    }

    constructor(def: BindingDefinition<P, T> | string, private deferBinding = false) { // , dataOverride?: any) {
        var localDef: BindingDefinition<P, T> = null;
        if(typeof def === 'string')
            localDef = ComponentFunction(def, this.constructor as TemplateConstructor<P, T>);
        else {
            localDef = {} as BindingDefinition<P, T>;
            for(var key in def)
                (localDef as any)[key] = (def as any)[key];
        }
        
        this.templates = this.DefaultTemplates;
        this.SetTemplates(localDef.templates);
        localDef.children = localDef.children || this.Template.bind(this);
        this.definition = localDef;
        this.destroyed = false;
        this.bindings = [];
        this.injector = new Injector();
    }

    public SetTemplates(templates: T) {
        if(!templates)
            return;
        
        for(var key in templates) {
            this.templates[key] = templates[key];
        }
    }

    /* public UpdateComplete(callback: () => void) {
        BindingConfig.updateComplete(callback);
    } */

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

    public Destroy(parentDestroyed = false) {
        if(!parentDestroyed)
            this.Detach();
        
        this.bindingRoot = null;
        this.bindings.forEach(b => b.Destroy(true));
        this.bindings = [];
        this.destroyed = true;
    }

    protected Template(c: P, i: number): BindingDefinitions<any, any> {
        return [];
    }
}

export class Component<P, T extends Templates> extends Template<Scope<P | P[]>, T> {
    constructor(definition: BindingDefinition<P, T> | string, deferBinding = false) {
        if(typeof definition === 'string')
            super(definition, deferBinding);
        else {
            if(definition.data) {
                (definition as any as BindingDefinition<Scope<P>, T>).data = new Scope(definition.data as {(): P});
                super(definition as any as BindingDefinition<Scope<P>, T>, deferBinding);
            }
            else {
                var data = definition.static;
                (definition as any as BindingDefinition<Scope<P | P[]>, T>).data = new Scope(() => data);
                super(definition as any as BindingDefinition<Scope<P | P[]> ,T>, deferBinding);
            }
        }
    }
}

export namespace Template {
    export function ToFunction<P, T extends Templates>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T> {
        return CreateComponentFunction(type, classType);
    }

    export function Create(bindingDef: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any> {
        var constructor = (bindingDef.class || Template) as { new(bindingDef: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any> };
        var template = new constructor(bindingDef, deferBinding);
        return template;
    }
}