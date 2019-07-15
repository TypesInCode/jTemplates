import { TemplateFunction } from "../Template/template";
import { TemplateDefinition, BindingDefinition, ChildrenOr } from "../Template/template.types";

export function svg<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("svg", "http://www.w3.org/2000/svg", templateDefinition, children);
}
export function g<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("g", "http://www.w3.org/2000/svg", templateDefinition, children);
}
export function circle<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("circle", "http://www.w3.org/2000/svg", templateDefinition, children);
}