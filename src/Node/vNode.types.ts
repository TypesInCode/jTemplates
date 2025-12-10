import { Component } from "./component";
import { IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { RecursivePartial } from "../Utils/utils.types";
import { Emitter } from "../Utils/emitter";

export type FunctionOr<T> = { (): T | Promise<T> } | T;

export type vNodeEvents<E extends { [event: string]: any } = any> = {
  [P in keyof E]?: { (events: E[P]): void };
};

export type vNodeChildrenFunction<T> =
  | ((data: T) => vNode | vNode[])
  | ((data: T) => string);

export type vNode = {
  type: string;
  definition: vNodeDefinition<any, any, any>;
  injector: Injector;
  node: Node | null;
  children: vNode[] | null;
  destroyed: boolean;
  onDestroyed: Emitter | null;
  scopes: IObservableScope<unknown>[];
  component: Component;
};

export type vNodeDefinition<
  P = HTMLElement,
  E = HTMLElementEventMap,
  T = never,
> = {
  type: string;
  node?: Node;
  namespace: string | null;
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
  children?: vNodeChildrenFunction<T>;
  childrenArray?: vNode[];
  componentConstructor?: { new (vnode: vNode): Component<any, any, any> };
};
