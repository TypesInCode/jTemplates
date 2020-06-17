import { FunctionOr, NodeDefinition } from "./boundNode.d";
import { NodeRef } from "..";

export type ComponentNodeEvents<E = void> = {
    [P in keyof E]: {(data?: E[P]): void};
}

export interface ComponentNodeDefinition<D = void, E = void> extends NodeDefinition<D> {
    on: ComponentNodeEvents<E>;
    data?: {(): D | Promise<D>};
}

export interface ComponentNodeFunctionParam<D = void, E = void> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<ComponentNodeEvents<E>>;
    data?: {(): D | Promise<D> };
}

export type ComponentNodeFunction<D = void, T = void, E = void> = (nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) => NodeRef;