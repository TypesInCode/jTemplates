export declare type BindingDefinitions<P, T> = BindingDefinition<P, T> | Array<BindingDefinition<P, T>>;
export declare type Templates<T> = {
    [P in keyof T]: (c: any, i: number) => BindingDefinitions<any, any>;
};
export declare type PromiseOr<T> = {
    (): Promise<T> | T;
} | T;
export interface BindingDefinition<P, T> {
    type: any;
    props?: PromiseOr<{
        [name: string]: any;
    }>;
    on?: PromiseOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    data?: PromiseOr<P | Array<P>>;
    key?: (val: P) => any;
    text?: PromiseOr<string>;
    children?: (c?: P, i?: number) => BindingDefinitions<P, T>;
    class?: {
        new (bindingDef?: BindingDefinition<any, any>): ITemplate<P, T>;
    };
    templates?: Templates<T>;
}
export interface TemplateDefinition<P> {
    props?: PromiseOr<{
        [name: string]: any;
    }>;
    on?: PromiseOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    data?: PromiseOr<P | Array<P>>;
    key?: (val: P) => any;
    text?: PromiseOr<string>;
}
export interface ComponentDefinition<P, T> {
    props?: PromiseOr<{
        [name: string]: any;
    }>;
    on?: PromiseOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    data?: PromiseOr<P | Array<P>>;
    key?: (val: P) => any;
}
export declare type BoundComponentFunction<P, T> = {
    (componentDefinition?: ComponentDefinition<P, T>, templates?: Templates<T>): BindingDefinition<P, T>;
};
export declare type TemplateConstructor<P, T> = {
    new (bindingDef: BindingDefinition<P, T>): ITemplate<P, T>;
};
export interface ITemplate<P, T> {
    SetTemplates(templates: Templates<T>): void;
    AttachTo(bindingParent: any): void;
    Detach(): void;
    Destroy(): void;
}
