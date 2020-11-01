import { BoundNodeFunctionParam, FunctionOr, NodeDefinition } from "./boundNode.types";
import { INodeRef } from "./nodeRef";

export type ComponentNodeEvents<E = void> = {
    [P in keyof E]: {(data?: E[P]): void};
}

export interface ComponentNodeDefinition<D = void, E = void> extends NodeDefinition<D> {
    on: ComponentNodeEvents<E>;
    data?: {(): D | Promise<D>};
}

export interface ComponentNodeFunctionParam<D = void, E = void> extends BoundNodeFunctionParam {
    on?: FunctionOr<ComponentNodeEvents<E>>;
    data?: { (): D | Promise<D> };
}

export type ComponentNodeFunction<D = void, T = void, E = void> = (nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) => INodeRef;