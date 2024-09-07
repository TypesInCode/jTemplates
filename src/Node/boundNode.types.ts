import { IObservableScope } from "../Store/Tree/observableScope";
import { NodeRefType } from "./nodeRef";
import { INodeRefBase } from "./nodeRef.types";

export type FunctionOr<T> = {(...args: Array<any>): T | Promise<T> } | T;

export type NodeRefEvents = {
    [name: string]: {(...args: Array<any>): void}
}

export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    props?: FunctionOr<{[name: string]: unknown}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
    text?: FunctionOr<string>;
}

export interface BoundNodeFunctionParam {
    props?: FunctionOr<{[name: string]: unknown}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
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