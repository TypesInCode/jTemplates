import { TemplateFunction } from "../Template/template";
import { TemplateDefinition, BindingDefinition, ChildrenOr } from "../Template/template.types";

export function svg<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("svg", templateDefinition, children);
}
export function g<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("g", templateDefinition, children);
}
export function circle<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("circle", templateDefinition, children);
}