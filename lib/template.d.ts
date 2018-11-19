import { BindingDefinitions, BindingDefinition, BoundComponentFunction, Templates, ITemplate, TemplateDefinition, TemplateConstructor } from './template.types';
export declare type BindingDefinitions<P, T> = BindingDefinitions<P, T>;
export declare type BindingDefinition<P, T> = BindingDefinition<P, T>;
export declare function TemplateFunction(type: string, templateDefinition?: TemplateDefinition<any>, children?: (c: any, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any>;
export declare function CreateComponentFunction<P, T>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T>;
export declare class Template<P, T> implements ITemplate<P, T> {
    private bindingDefinition;
    private bindings;
    private bindingRoot;
    private templates;
    protected readonly DefaultTemplates: Templates<T>;
    protected readonly Templates: Templates<T>;
    protected readonly Root: any;
    constructor(definition: BindingDefinition<P, T> | string);
    SetTemplates(templates: Templates<T>): void;
    AttachTo(bindingParent: any): void;
    AttachToContainer(container: any): void;
    AttachBefore(bindingParent: any, template: Template<any, any>): void;
    AttachAfter(bindingParent: any, template: Template<any, any>): void;
    Detach(): void;
    Destroy(): void;
    protected Template(c: P, i: number): BindingDefinitions<P, T>;
    private BindRoot;
}
