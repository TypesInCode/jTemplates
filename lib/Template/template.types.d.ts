export declare type Templates = {
    [name: string]: FunctionOr<BindingDefinitions<any, any>>;
};
export declare type FunctionOr<T> = {
    (...args: Array<any>): T;
} | T;
export declare type ChildrenFunction<P> = {
    (c: P, i: number): BindingDefinitions<any, any>;
};
export declare type ChildrenOr<P> = ChildrenFunction<P> | BindingDefinitions<any, any>;
export interface BindingDefinition<P, T extends Templates> {
    type: any;
    namespace: string;
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    static?: P | Array<P>;
    data?: any;
    key?: (val: P) => any;
    text?: FunctionOr<string>;
    children?: ChildrenOr<P>;
    class?: {
        new (bindingDef: BindingDefinition<any, any>, deferBinding: boolean): ITemplate<P, T>;
    };
    templates?: T;
}
export declare type BindingDefinitions<P, T extends Templates> = BindingDefinition<P, T> | Array<BindingDefinition<P, T>>;
export interface TemplateDefinition<P> {
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    static?: P | Array<P>;
    data?: {
        (): P | Array<P>;
    };
    key?: (val: P) => any;
    text?: FunctionOr<string>;
}
export interface ComponentDefinition<P, T> {
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    static?: P | Array<P>;
    data?: {
        (): P | Array<P>;
    };
    key?: (val: P) => any;
}
export declare type BoundComponentFunction<P, T extends Templates> = {
    (componentDefinition?: ComponentDefinition<P, T>, templates?: T): BindingDefinition<P, T>;
};
export declare type TemplateConstructor<P, T extends Templates> = {
    new (bindingDef: BindingDefinition<P, T>): ITemplate<P, T>;
};
export interface ITemplate<P, T> {
    SetTemplates(templates: Templates): void;
    AttachTo(bindingParent: any): void;
    Detach(): void;
    Destroy(): void;
}
