import { BoundNode, FunctionOr, NodeDefinition } from "./boundNode";
import { NodeRef } from "./nodeRef";
export declare type ElementNodeEvents = {
    [name: string]: {
        (event: Event): void;
    };
};
export interface ElementNodeFunctionParam<T> {
    immediate?: boolean;
    props?: FunctionOr<{
        [name: string]: any;
    }>;
    attrs?: FunctionOr<{
        [name: string]: string;
    }>;
    on?: FunctionOr<ElementNodeEvents>;
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
    private keyDataScope;
    private lastEvents;
    constructor(nodeDef: ElementNodeDefinition<T>);
    private setData;
    ScheduleSetData(): void;
    SetData(): void;
    SetEvents(): void;
    Init(): void;
    Destroy(): void;
}
export declare namespace ElementNode {
    function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: {
        (data?: T, i?: number): NodeRef | NodeRef[];
    }): ElementNode<any>;
}
