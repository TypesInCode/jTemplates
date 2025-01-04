import { Component } from "./component";
import { IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector"
import { RecursivePartial } from "../Utils/utils.types";

export type FunctionOr<T> = {(): T | Promise<T> } | T;

export type vNodeEvents<E extends {[event: string]: any} = any> = {
    [P in keyof E]?: { (events: E[P]): void }
}

export type vNode = {
    definition: vNodeDefinition<any, any, any>;
    injector: Injector;
    node: Node | null;
    children: vNode[] | null;
    destroyed: boolean;
    scopes: IObservableScope<unknown>[];
    component: Component;
}

export type vNodeDefinition<P = HTMLElement, E = HTMLElementEventMap, T = never> = {
    type: string;
    namespace: string | null;
    props?: FunctionOr<RecursivePartial<P>>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<vNodeEvents<E>>;
    data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
    children?: (data: T) => string | vNode | vNode[];
    childrenArray?: vNode[];
    componentConstructor?: { new(vnode: vNode): Component<any, any, any> };
}