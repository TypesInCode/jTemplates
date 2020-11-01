export type FunctionOr<T> = {(...args: Array<any>): T | Promise<T> } | T;

export type NodeRefEvents = {
    [name: string]: {(...args: Array<any>): void}
}

export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
}

export interface BoundNodeFunctionParam {
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
}