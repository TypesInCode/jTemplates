import { ElementNode } from "../Node/elementNode";
import { INodeRef } from "../Node/nodeRef";
import { ElementNodeFunctionParam } from "../Node/elementNode.types";

const svgNs = "http://www.w3.org/2000/svg";

export function svg<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T): INodeRef | INodeRef[]}) {
    return ElementNode.Create("svg", svgNs, nodeDef, children);
}

export function g<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T): INodeRef | INodeRef[]}) {
    return ElementNode.Create("g", svgNs, nodeDef, children);
}

export function circle<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T): INodeRef | INodeRef[]}) {
    return ElementNode.Create("circle", svgNs, nodeDef, children);
}