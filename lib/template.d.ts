import { BindingDefinitions, BindingDefinition, ComponentDefinition, BoundTemplateFunction, BoundComponentFunction, Templates, ITemplate, TemplateDefinition } from './template.d';
export declare type BindingDefinitions = BindingDefinitions;
export declare type BindingDefinition<P, T> = BindingDefinition<P, T>;
export declare function TemplateFunction(type: string, templateDefinition?: TemplateDefinition<any>, children?: (c: any, i: number) => BindingDefinitions): BindingDefinition<any, any>;
export declare function CreateTemplateFunction(type: any): BoundTemplateFunction;
export declare function ComponentFunction<P, T>(type: string, classType: {
    new (bindingDef?: BindingDefinition<any, any>): Template<P, T>;
}, componentDefinition?: ComponentDefinition<P, T>, templates?: Templates<T>): BindingDefinition<P, T>;
export declare function CreateComponentFunction<P, T>(type: any, classType: {
    new (bindingDef?: BindingDefinition<P, T>): Template<P, T>;
}): BoundComponentFunction<P, T>;
export declare class Template<P, T> implements ITemplate<P, T> {
    private bindingDefinition;
    private bindings;
    private bindingParent;
    private bindingRoot;
    private templates;
    protected readonly DefaultTemplates: Templates<T>;
    protected readonly Templates: Templates<T>;
    constructor(definition: BindingDefinition<P, T>);
    SetTemplates(templates: Templates<T>): void;
    AttachTo(bindingParent: any): void;
    Detach(): void;
    Destroy(): void;
    protected Template(c: P, i: number): BindingDefinitions;
    private BindRoot;
}
