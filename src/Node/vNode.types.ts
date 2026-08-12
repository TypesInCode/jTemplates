import { Component } from "./component";
import { IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { RecursivePartial } from "../Utils/utils.types";
import { Emitter } from "../Utils/emitter";

export const STRING_NODE = Symbol("STRING_NODE");
export const TEXT_NODE = Symbol("TEXT_NODE");
export const FRAGMENT_NODE = Symbol("FRAGMENT_NODE");

export type FunctionOr<T> = { (): T | Promise<T> } | T;

export type vNodeEvents<E extends { [event: string]: any } = any> = {
  [P in keyof E]?: { (events: E[P]): void };
};

export type vNodeChildrenFunction<T> =
  | ((data: T) => vNode | vNode[])
  | ((data: T) => string);

export type vNodeConfig<P = HTMLElement, E = HTMLElementEventMap, T = never> = {
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
};

export type vStringNode = {
  type: typeof STRING_NODE;
  node: string;
};

export type vElementNode = {
  type: string | typeof TEXT_NODE | typeof FRAGMENT_NODE;
  definition: vNodeDefinition<any, any, any>;
  injector: Injector;
  parentNode: vElementNode | null;
  node: Node | null;
  children: vNode[],
  destroyed: boolean;
  onDestroyed: Emitter | null;
  scopes: IObservableScope<unknown>[];
  component: Component;
};

export type vNode = vStringNode | vElementNode;

export function isStringNode(vnode: vNode): vnode is vStringNode {
  return vnode.type === STRING_NODE;
}

export type vNodeDefinition<
  P = HTMLElement,
  E = HTMLElementEventMap,
  T = never,
> = {
  type: string | typeof TEXT_NODE | typeof FRAGMENT_NODE;
  node?: Node;
  namespace: string | null;
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
  children?: vNodeChildrenFunction<T>;
  childrenArray?: vNode[];
  componentFactory?: (vnode: vNode) => Component<any, any, any>;
};
