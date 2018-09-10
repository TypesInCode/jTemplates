import { BindingDefinitions, BindingDefinition, BoundTemplateFunction, BoundComponentFunction, Templates, ITemplate, TemplateConstructor } from './template.d';
export declare type BindingDefinitions = BindingDefinitions;
export declare type BindingDefinition<P, T> = BindingDefinition<P, T>;
export declare function CreateTemplateFunction(type: any): BoundTemplateFunction;
export declare function CreateComponentFunction<P, T>(type: any, classType: TemplateConstructor<P, T>): BoundComponentFunction<P, T>;
export declare class Template<P, T> implements ITemplate<P, T> {
    private bindingDefinition;
    private bindings;
    private bindingParent;
    private bindingRoot;
    private templates;
    protected readonly DefaultTemplates: Templates<T>;
    protected readonly Templates: Templates<T>;
    constructor(definition: BindingDefinition<P, T> | string);
    SetTemplates(templates: Templates<T>): void;
    AttachTo(bindingParent: any): void;
    Detach(): void;
    Destroy(): void;
    protected Template(c: P, i: number): BindingDefinitions;
    private BindRoot;
}
