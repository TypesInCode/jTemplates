import { FunctionOr, NodeDefinition } from "./boundNode.types";
import { NodeRef } from "..";

export type ComponentNodeEvents<E = void> = {
    [P in keyof E]: {(data?: E[P]): void};
}

export interface ComponentNodeDefinition<D = void, E = void> extends NodeDefinition<D> {
    on: ComponentNodeEvents<E>;
    static?: D;
    data?: {(): D | Promise<D>};
}

export interface ComponentNodeFunctionParam<D = void, T = void, E = void> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<ComponentNodeEvents<E>>;
    static?: D | Array<D>;
    data?: {(): D | Promise<D> };
    templates?: T;
}

export type ComponentNodeFunction<D = void, T = void, E = void> = (nodeDef: ComponentNodeFunctionParam<D, T, E>, templates?: T) => NodeRef;