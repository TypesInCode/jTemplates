import { BoundNode, FunctionOr, NodeDefinition } from "./boundNode";
import { NodeRef } from "./nodeRef";
export interface ElementNodeFunctionParam<T> {
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<{
        [name: string]: {
            (event?: any): void;
        };
    }>;
    static?: T | Array<T>;
    data?: {
        (): T | Array<T>;
    };
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}
export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    children?: {
        (data?: T, i?: number): BoundNode;
    };
}
export declare type ElementNodeFunction<T> = {
    (nodeDef: ElementNodeFunctionParam<T>, children?: {
        (data?: T, i?: number): NodeRef | NodeRef[];
    }): BoundNode;
};
export declare class ElementNode<T> extends BoundNode {
    private childrenFunc;
    private keyFunc;
    private nodeRefMap;
    private dataScope;
    constructor(nodeDef: ElementNodeDefinition<T>);
    private setData;
    ScheduleSetData(): void;
    SetData(): void;
    Destroy(): void;
}
export declare namespace ElementNode {
    function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: {
        (data?: T, i?: number): NodeRef | NodeRef[];
    }): ElementNode<any>;
}
