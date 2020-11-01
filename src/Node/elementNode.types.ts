import { NodeDefinition, BoundNodeFunctionParam } from "./boundNode.types";
import { INodeRef } from "./nodeRef";

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    data?: {(): T | Array<T> | Promise<Array<T>> | Promise<T> };
    children?: {(data?: T): string | INodeRef | INodeRef[]};
}

export interface ElementNodeFunctionParam<T> extends BoundNodeFunctionParam {
    data?: {(): T | Array<T> | Promise<Array<T>> | Promise<T> };
}

export type ElementChildrenFunction<T> = {(data?: T): string | INodeRef | INodeRef[]};
export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): INodeRef}