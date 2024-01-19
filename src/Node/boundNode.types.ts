import { IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { IDestroyable } from "../Utils/utils.types";
import { NodeRefType } from "./nodeRef";
import { INodeRef, INodeRefBase } from "./nodeRef.types";

export type FunctionOr<T> = {(...args: Array<any>): T | Promise<T> } | T;

export type NodeRefEvents = {
    [name: string]: {(...args: Array<any>): void}
}

export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
}

export interface BoundNodeFunctionParam {
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
}

export interface IBoundNodeBase extends INodeRefBase {
    nodeDef: BoundNodeFunctionParam;
    lastEvents: {[name: string]: any};

    scopes: IObservableScope<unknown>[];
    setProperties: boolean;
    assignProperties: {(next: any): void};
    setAttributes: boolean;
    setEvents: boolean;
}

export interface IBoundNode extends IBoundNodeBase {
    type: NodeRefType.BoundNode;
}