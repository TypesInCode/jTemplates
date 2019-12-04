import { ElementNode, ElementNodeFunctionParam } from "../Node/elementNode";
import { NodeRef } from "../Node/nodeRef";

export function div<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("div", null, nodeDef, children);
}

export function a<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("a", null, nodeDef, children);
}

export function ul<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("ul", null, nodeDef, children);
}

export function li<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("li", null, nodeDef, children);
}

export function br<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("br", null, nodeDef, null);
}

export function b<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("b", null, nodeDef);
}

export function span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("span", null, nodeDef, children);
}

export function img<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("img", null, nodeDef, null);
}

export function video<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("video", null, nodeDef, children);
}

export function source<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("source", null, nodeDef, null);
}

export function input<T>(nodeDef: ElementNodeFunctionParam<T>) {
    nodeDef.immediate = true;
    return ElementNode.Create("input", null, nodeDef, null);
}

export function select<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("select", null, nodeDef, children);
}

export function option<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("div", null, nodeDef, null);
}

export function h1<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("h1", null, nodeDef, null);
}

export function h2<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("h2", null, nodeDef, null);
}

export function h3<T>(nodeDef: ElementNodeFunctionParam<T>) {
    return ElementNode.Create("h3", null, nodeDef, null);
}

export function p<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("p", null, nodeDef, children);
}

export function style<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("style", null, nodeDef, children);
}

export function button<T>(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
    return ElementNode.Create("button", null, nodeDef, children);
}

/* export function a<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("a", null, templateDefinition, children);
}
export function ul<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("ul", null, templateDefinition, children);
}
export function li<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("li", null, templateDefinition, children);
}
export function br<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("br", null, templateDefinition, children);
}
export function b<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("b", null, templateDefinition, children);
}
export function div<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("div", null, templateDefinition, children);
}
export function span<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("span", null, templateDefinition, children);
}
export function img<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("img", null, templateDefinition, children);
}
export function video<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("video", null, templateDefinition, children);
}
export function source<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("source", null, templateDefinition, children);
}
export function input<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("input", null, templateDefinition, children);
}
export function option<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("option", null, templateDefinition, children);
}
export function select<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("select", null, templateDefinition, children);
}
export function h1<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("h1", null, templateDefinition, children);
}
export function h2<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("h2", null, templateDefinition, children);
}
export function h3<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("h3", null, templateDefinition, children);
}
export function table<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("table", null, templateDefinition, children);
}
export function th<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("th", null, templateDefinition, children);
}
export function tr<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("tr", null, templateDefinition, children);
}
export function td<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("td", null, templateDefinition, children);
}
export function p<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("p", null, templateDefinition, children);
}
export function style<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("style", null, templateDefinition, children);
} */