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
import AttributeBinding from "./Binding/attributeBinding";
import { NodeRef } from "./nodeRef";

export function TemplateFunction(type: string, namespace: string, templateDefinition?: TemplateDefinition<any>, children?: ChildrenOr<any>): BindingDefinition<any, any> {
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
    }
}

function ComponentFunction<P, T extends Templates>(type: string, classType: TemplateConstructor<P, T>, componentDefinition?: ComponentDefinition<P, T>, templates?: T): BindingDefinition<P, T> {
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
    }
}

function CreateComponentFunction<P, T extends Templates>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T> {
    return ComponentFunction.bind(null, type, classType) as BoundComponentFunction<P, T>;
}

// function DefaultDataCallback() { return true; }
function BindTarget(bindingTarget: NodeRef, bindingDef: BindingDefinition<any, any>): Array<Binding<any>> {
    var ret: Array<Binding<any>> = [];
    var def1 = bindingDef as BindingDefinition<any, any>;
    if(def1.props)
        ret.push(new PropertyBinding(bindingTarget, def1.props));
    
    if(def1.attrs)
        ret.push(new AttributeBinding(bindingTarget, def1.attrs));

    if(def1.on)
        ret.push(new EventBinding(bindingTarget, def1.on));

    if(def1.text)
        ret.push(new TextBinding(bindingTarget, def1.text));
    /* else if(def1.children) {
        def1.data = def1.data || def1.static || true; //DefaultDataCallback;
        ret.push(new DataBinding(bindingTarget, def1.data, def1.children, def1.key));
    } */

    return ret;
}

function DataBindTarget(bindingTarget: NodeRef, bindingDef: BindingDefinition<any, any>): DataBinding {
    if(bindingDef.children)
        return new DataBinding(bindingTarget, bindingDef.data || bindingDef.static || true, bindingDef.children, bindingDef.key);

    return null;
}

export class Template<P, T extends Templates> implements ITemplate<P, T> {
    private definition: BindingDefinition<P, T>;
    private bindings: Array<Binding<any>>;
    private bindingRoot: NodeRef;
    private dataBound: boolean;
    private dataBinding: DataBinding;
    private templates: T;
    // private destroyed: boolean;
    private injector: Injector;

    public get Root(): NodeRef {
        if(!this.dataBound) {
            Injector.Scope(this.injector, () => this.dataBinding = DataBindTarget(this.bindingRoot, this.definition));
            this.dataBound = true;
        }
        /* if(!this.bindingRoot && !this.destroyed) {
            this.bindingRoot = new NodeRef(this.definition.type, this.definition.namespace); //BindingConfig.createBindingTarget(this.definition.type, this.definition.namespace);
            if(!this.deferBinding) {
                Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
                this.Bound();
            }
            else
                BindingConfig.scheduleUpdate(() => {
                    if(!this.destroyed) {
                        Injector.Scope(this.injector, () => this.bindings = BindTarget(this.bindingRoot, this.definition));
                        this.Bound();
                    }
                });
        } */
        
        return this.bindingRoot;
    }

    protected get DefaultTemplates(): T {
        return {} as T;
    }

    protected get Templates(): T {
        return this.templates;
    }

    protected get Injector(): Injector {
        return this.injector;
    }

    /* protected get Store(): AbstractStore {
        return this.Injector.Get(AbstractStore);
    } */

    constructor(definition: BindingDefinition<P, T> | string, private deferBinding = false) { // , dataOverride?: any) {
        if(typeof definition === 'string')
            definition = ComponentFunction(definition, this.constructor as TemplateConstructor<P, T>);
        
        this.templates = this.DefaultTemplates;
        this.SetTemplates(definition.templates);
        definition.children = definition.children || this.Template.bind(this);
        this.definition = definition;
        this.bindingRoot = new NodeRef(this.definition.type, this.definition.namespace);
        this.dataBound = false;
        // this.destroyed = false;
        this.injector = new Injector();
        this.Init();
    }

    public SetTemplates(templates: T) {
        if(!templates)
            return;
        
        for(var key in templates) {
            this.templates[key] = templates[key];
        }
    }

    public BindTemplate() {
        if(!this.deferBinding) {
            Injector.Scope(this.injector, () => this.bindings = BindTarget(this.Root, this.definition));
            this.Bound();
        }
        else {
            BindingConfig.scheduleUpdate(() => {
                Injector.Scope(this.injector, () => this.bindings = BindTarget(this.Root, this.definition))
                this.Bound();
            });
        }
    }

    public AttachTo(parent: NodeRef | Node) {
        if(!(parent instanceof NodeRef))
            parent = new NodeRef(parent);

        // BindingConfig.addChild(parent, this.Root);
        parent.AddChild(this.Root);
        // this.Root.Attached();
    }

    /* public AttachToContainer(container: any) {
        BindingConfig.addContainerChild(container, this.Root);
    }

    public AttachBefore(bindingParent: any, template: Template<any, any>) {
        BindingConfig.addChildBefore(bindingParent, template && template.Root, this.Root);
    } */

    public AttachAfter(rootParent: NodeRef, template: Template<any, any>) {
        // BindingConfig.addChildAfter(bindingParent, template && template.Root, this.Root);
        rootParent.AddChildAfter(template && template.Root, this.Root);
        // this.Root.Attached();
    }

    public Detach() {
        // BindingConfig.remove(this.Root);
        this.Root.Detach();
    }

    public Destroy() {
        // if(!parentDestroyed)
            this.Detach();
        
        this.bindingRoot = null;
        this.dataBinding && this.dataBinding.Destroy();
        this.dataBinding = null;
        this.bindings && this.bindings.forEach(b => b.Destroy());
        this.bindings = null;
        // this.destroyed = true;
    }

    protected Template(c: P, i: number): BindingDefinitions<any, any> {
        return [];
    }

    protected Init() {

    }

    protected Bound() {

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

    export function Create(def: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any> {
        var localDef = {} as BindingDefinition<any, any>;
        for(var key in def)
            (localDef as any)[key] = (def as any)[key];

        var constructor = (localDef.class || Template) as { new(def: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any> };
        var template = new constructor(localDef, deferBinding);
        return template;
    }
}