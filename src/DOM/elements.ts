import { TemplateFunction } from "../template";
import { TemplateDefinition, BindingDefinitions, BindingDefinition } from "../template.types";

export function a<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("a", templateDefinition, children);
}

export function br<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("br", templateDefinition, children);
}
export function b<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("b", templateDefinition, children);
}
export function div<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("div", templateDefinition, children);
}
export function span<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("span", templateDefinition, children);
}
export function img<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("img", templateDefinition, children);
}
export function video<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("video", templateDefinition, children);
}
export function source<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("source", templateDefinition, children);
}
export function input<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("input", templateDefinition, children);
}
export function option<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("option", templateDefinition, children);
}
export function select<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("select", templateDefinition, children);
}
export function h1<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("h1", templateDefinition, children);
}
export function h2<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("h2", templateDefinition, children);
}
export function h3<P>(templateDefinition?: TemplateDefinition<P>, children?: (c: P, i: number) => BindingDefinitions<any, any>): BindingDefinition<any, any> {
    return TemplateFunction("h3", templateDefinition, children);
}