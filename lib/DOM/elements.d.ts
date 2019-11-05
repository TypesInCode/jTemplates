import { ElementNode, ElementNodeFunctionParam } from "../Node/elementNode";
import { NodeRef } from "../Node/nodeRef";
export declare function div<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function a<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function ul<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function li<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function br<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function b<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function img<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function video<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function source<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function input<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function select<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function option<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function h1<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function h2<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function h3<T>(nodeDef: ElementNodeFunctionParam<T>): ElementNode<any>;
export declare function p<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
export declare function style<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {
    (data?: T, i?: number): NodeRef | NodeRef[];
}): ElementNode<any>;
