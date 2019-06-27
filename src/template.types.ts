export type Templates = {
    [name: string]: ChildrenOr<any>
}

// export type PromiseOr<T> = {(): Promise<T> | T} | T;
export type FunctionOr<T> = {(): T } | T;
export type ChildrenFunction<P> = {(c: P, i: number): BindingDefinitions<any, any>};
export type ChildrenOr<P> = ChildrenFunction<P> | BindingDefinitions<any, any>;

export interface BindingDefinition<P, T extends Templates> {
    type: any;
    props?: FunctionOr<{[name: string]: any}>; //{(): {[name: string]: any}} | {[name: string]: any};
    on?: FunctionOr<{[name: string]: {(event?: any): void}}>; // {(): {[name: string]: {(event?: any): void}}} | {[name: string]: {(event?: any): void}};
    data?: FunctionOr<P | Array<P>>; //{(): P | Array<P>} | P | Array<P>;
    key?: (val: P) => any;
    text?: FunctionOr<string>; //{(): string} | string;
    children?: ChildrenOr<P> // (c?: P, i?: number) => BindingDefinitions<P, T> | BindingDefinitions<P, T>;
    class?: { new(bindingDef: BindingDefinition<any, any>, deferBinding: boolean): ITemplate<P, T> };
    templates?: T;
}

export type BindingDefinitions<P, T extends Templates> = BindingDefinition<P, T> | Array<BindingDefinition<P, T>>;

export interface TemplateDefinition<P> {
    props?: FunctionOr<{[name: string]: any}>; //{(): {[name: string]: any}} | {[name: string]: any};
    on?: FunctionOr<{[name: string]: {(event?: any): void}}>; // {(): {[name: string]: {(event?: any): void}}} | {[name: string]: {(event?: any): void}};
    data?: FunctionOr<P | Array<P>>; // {(): P | Array<P>} | P | Array<P>;
    key?: (val: P) => any;
    text?: FunctionOr<string>; // {(): string} | string;
}

export interface ComponentDefinition<P, T> {
    props?: FunctionOr<{[name: string]: any}>; //{(): {[name: string]: any}} | {[name: string]: any};
    on?: FunctionOr<{[name: string]: {(event?: any): void}}>; // {(): {[name: string]: {(event?: any): void}}} | {[name: string]: {(event?: any): void}};
    data?: FunctionOr<P | Array<P>>; // {(): P | Array<P>} | P | Array<P>;
    key?: (val: P) => any;
}

export type BoundComponentFunction<P, T extends Templates> = { (componentDefinition?: ComponentDefinition<P, T>, templates?: T): BindingDefinition<P, T> };

export type TemplateConstructor<P, T extends Templates> = { new(bindingDef: BindingDefinition<P, T>): ITemplate<P, T> }

export interface ITemplate<P, T> {
    SetTemplates(templates: Templates): void;
    AttachTo(bindingParent: any): void;
    Detach(): void;
    Destroy(): void;
}