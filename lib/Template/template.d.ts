import { BindingDefinitions, BindingDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor, ChildrenOr } from './template.types';
import { Scope } from "../Store/scope/scope";
import { Injector } from "../injector";
import { NodeRef } from "./nodeRef";
export declare function TemplateFunction(type: string, namespace: string, templateDefinition?: TemplateDefinition<any>, children?: ChildrenOr<any>): BindingDefinition<any, any>;
export declare class Template<P, T extends Templates> implements ITemplate<P, T> {
    private deferBinding;
    private definition;
    private bindings;
    private bindingRoot;
    private dataBound;
    private dataBinding;
    private templates;
    private injector;
    readonly Root: NodeRef;
    protected readonly DefaultTemplates: T;
    protected readonly Templates: T;
    protected readonly Injector: Injector;
    constructor(definition: BindingDefinition<P, T> | string, deferBinding?: boolean);
    SetTemplates(templates: T): void;
    BindTemplate(): void;
    AttachTo(parent: NodeRef | Node): void;
    AttachAfter(rootParent: NodeRef, template: Template<any, any>): void;
    Detach(): void;
    Destroy(): void;
    protected Template(c: P, i: number): BindingDefinitions<any, any>;
    protected Init(): void;
    protected Bound(): void;
}
export declare class Component<P, T extends Templates> extends Template<Scope<P | P[]>, T> {
    constructor(definition: BindingDefinition<P, T> | string, deferBinding?: boolean);
}
export declare namespace Template {
    function ToFunction<P, T extends Templates>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T>;
    function Create(def: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any>;
}
