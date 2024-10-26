import { IObservableScope } from "../Store/Tree/observableScope";
import { RecursivePartial } from "../Utils/utils.types";
import { NodeRefType } from "./nodeRef";
import { INodeRefBase } from "./nodeRef.types";

export type FunctionOr<T> = {(...args: Array<any>): T | Promise<T> } | T;

export type NodeRefEvents<E extends {[event: string]: any} = any> = {
    [P in keyof E]?: { (events: E[P]): void }
}

export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    props?: FunctionOr<{[name: string]: unknown}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents<E>>;
    text?: FunctionOr<string>;
}

export interface BoundNodeFunctionParam<P = HTMLElement, E = HTMLElementEventMap> {
    props?: FunctionOr<RecursivePartial<P>>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents<E>>;
    text?: FunctionOr<string>;
}

export interface IBoundNodeBase extends INodeRefBase {
    nodeDef: BoundNodeFunctionParam;
    scopes: IObservableScope<unknown>[];
    setProperties: boolean;
    assignProperties: {(next: any): void};
    assignEvents: {(next: {[event: string]: (event: Event) => void }): void};
    assignText: {(next: string): void};
    setAttributes: boolean;
    setEvents: boolean;
    setText: boolean;
}

export interface IBoundNode extends IBoundNodeBase {
    type: NodeRefType.BoundNode;
}