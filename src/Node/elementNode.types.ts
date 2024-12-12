import { IObservableScope } from "../Store/Tree/observableScope";
import { IList } from "../Utils/list";
import {
  NodeDefinition,
  BoundNodeFunctionParam,
  IBoundNodeBase,
} from "./boundNode.types";
import { NodeRefType } from "./nodeRef";
import { INodeRefBase, ElementNodeRefTypes, AllNodeRefTypes } from "./nodeRef.types";

export type ElementChildrenFunction<T> = {
  (data: T): string | ElementNodeRefTypes | ElementNodeRefTypes[];
};
export type ElementChildrenFunctionParam<T> =
  | ElementChildrenFunction<T>
  | ElementNodeRefTypes[];
export type ElementNodeFunction<T> = {
  (
    nodeDef: ElementNodeFunctionParam<T>,
    children?: ElementChildrenFunctionParam<T>,
  ): INodeRefBase;
};

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
  data?: { (): T | Array<T> | Promise<Array<T>> | Promise<T> };
  children?: ElementChildrenFunction<T>;
}

export interface ElementNodeFunctionParam<
  T,
  P = HTMLElement,
  E = HTMLElementEventMap,
> extends BoundNodeFunctionParam<P, E> {
  data?: { (): T | Array<T> | Promise<Array<T>> | Promise<T> };
}

export interface IElementDataNode<T> {
  value: T;
  init: boolean;
  scope: IObservableScope<AllNodeRefTypes[] | null>;
  nodes: AllNodeRefTypes[] | null;
}

export interface IElementNodeBase<T> extends IBoundNodeBase {
  nodeDef: ElementNodeFunctionParam<T>;
  children: ElementChildrenFunction<T>;
  childrenArray: ElementNodeRefTypes[];
  destroyNodeList: IList<IElementDataNode<T>>;
  setData: boolean;
}

export interface IElementNode<T> extends IElementNodeBase<T> {
  type: NodeRefType.ElementNode;
  childNodes: Set<AllNodeRefTypes>;
}
