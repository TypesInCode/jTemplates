import { BindingDefinitions, BindingDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor, ChildrenOr } from './template.types';
import { Scope } from "./Store/scope/scope";
export declare type BindingDefinitions<P, T extends Templates> = BindingDefinitions<P, T>;
export declare type BindingDefinition<P, T extends Templates> = BindingDefinition<P, T>;
export declare function TemplateFunction(type: string, templateDefinition?: TemplateDefinition<any>, children?: ChildrenOr<any>): BindingDefinition<any, any>;
export declare class Template<P, T extends Templates> implements ITemplate<P, T> {
    private deferBinding;
    private definition;
    private bindings;
    private bindingRoot;
    private templates;
    private destroyed;
    protected readonly DefaultTemplates: T;
    protected readonly Templates: T;
    protected readonly Root: any;
    constructor(definition: BindingDefinition<P, T> | string, deferBinding?: boolean);
    SetTemplates(templates: T): void;
    AttachTo(bindingParent: any): void;
    AttachToContainer(container: any): void;
    AttachBefore(bindingParent: any, template: Template<any, any>): void;
    AttachAfter(bindingParent: any, template: Template<any, any>): void;
    Detach(): void;
    Destroy(parentDestroyed?: boolean): void;
    protected Template(c: P, i: number): BindingDefinitions<any, any>;
}
export declare class Component<P, T extends Templates> extends Template<Scope<P | P[]>, T> {
    constructor(definition: BindingDefinition<P, T> | string, deferBinding?: boolean);
}
export declare namespace Template {
    function ToFunction<P, T extends Templates>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T>;
    function Create(bindingDef: BindingDefinition<any, any>, deferBinding: boolean): Template<any, any>;
}
