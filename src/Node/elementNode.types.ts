import { IList } from "../Utils/list";
import { NodeDefinition, BoundNodeFunctionParam, IBoundNodeBase } from "./boundNode.types";
import { NodeRefType } from "./nodeRef";
import { INodeRefBase, NodeRefTypes } from "./nodeRef.types";

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    data?: {(): T | Array<T> | Promise<Array<T>> | Promise<T> };
    children?: {(data?: T): string | NodeRefTypes | NodeRefTypes[]};
}

export interface ElementNodeFunctionParam<T> extends BoundNodeFunctionParam {
    data?: {(): T | Array<T> | Promise<Array<T>> | Promise<T> };
}

export type ElementChildrenFunction<T> = {(data: T): string | NodeRefTypes | NodeRefTypes[]};
export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): INodeRefBase}

export interface IElementDataNode<T> {
    value: T,
    init: boolean;
    nodes: NodeRefTypes[] | null
}

export interface IElementNodeBase<T> extends IBoundNodeBase {
    nodeDef: ElementNodeFunctionParam<T>;
    childrenFunc: {(data: T): string | NodeRefTypes | NodeRefTypes[]};
    nodeList: IList<IElementDataNode<T>> | null;
    setData: boolean;
}

export interface IElementNode<T> extends IElementNodeBase<T> {
    type: NodeRefType.ElementNode;
}