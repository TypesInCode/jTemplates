export type BindingDefinitions = BindingDefinition<any, any> | Array<BindingDefinition<any, any>>;

export type Templates<T> = {
    [P in keyof T]: (c: any, i: number) => BindingDefinitions
}

export interface BindingDefinition<P, T> {
    type: any;
    props?: () => {[name: string]: any};
    on?: () => {[name: string]: {(event?: any): void}};
    data?: () => P | Array<P>;
    text?: () => string;
    children?: (c?: P, i?: number) => BindingDefinitions;
    class?: { new(bindingDef?: BindingDefinition<any, any>): ITemplate<P, T> };
    templates?: Templates<T>;
}

export interface TemplateDefinition<P> {
    props?: () => {[name: string]: any};
    on?: () => {[name: string]: {(event?: any): void}};
    data?: () => P | Array<P>;
    text?: () => string;
    // children?: (c?: P, i?: number) => TemplateDefinition;
}

export interface ComponentDefinition<P, T> {
    props?: () => {[name: string]: any};
    on?: () => {[name: string]: {(event?: any): void}};
    data?: () => P | Array<P>;
    //templates?: Templates<T>;
}

export type BoundTemplateFunction = { (templateDefinition?: TemplateDefinition<any>, children?: (c: any, i: number) => BindingDefinitions): BindingDefinition<any, any> };
export type BoundComponentFunction<P, T> = { (componentDefinition?: ComponentDefinition<P, T>, templates?: Templates<T>): BindingDefinition<P, T> };

export interface ITemplate<P, T> {
    SetTemplates(templates: Templates<T>): void;

    AttachTo(bindingParent: any): void;

    Detach(): void;

    Destroy(): void;
}