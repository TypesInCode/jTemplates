import { BoundNodeFunctionParam, IBoundNodeBase, NodeDefinition } from "./boundNode.types";
import { Component, ComponentConstructor } from "./component";
import { NodeRefType } from "./nodeRef";
import { AllNodeRefTypes } from "./nodeRef.types";

export type ComponentNodeEvents<E = void> = {
    [P in keyof E]?: {(data: E[P]): void};
}

export interface ComponentNodeDefinition<D = void, E = void> extends NodeDefinition<D> {
    on: ComponentNodeEvents<E>;
    data?: {(): D | Promise<D>};
}

export interface ComponentNodeFunctionParam<D = void, E = void, P = HTMLElement> extends BoundNodeFunctionParam<P> {
    on?: ComponentNodeEvents<E>;
    data?: { (): D | Promise<D> };
}

export type ComponentNodeFunction<D = void, T = void, E = void> = (nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) => IComponentNode<D, T, E>;

export interface IComponentNodeBase<D, T, E> extends IBoundNodeBase {
    nodeDef: ComponentNodeFunctionParam<D, E>;
    constructor: ComponentConstructor<D, T, E>;
    component: Component<D, T, E>;
    componentEvents: {[name: string]: {(...args: Array<any>): void}};
    templates: T;
}

export interface IComponentNode<D, T, E> extends IComponentNodeBase<D, T, E> {
    type: NodeRefType.ComponentNode;
    childNodes: AllNodeRefTypes[]
}