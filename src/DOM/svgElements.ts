import { TemplateFunction } from "../Template/template";
import { TemplateDefinition, BindingDefinition, ChildrenOr } from "../Template/template.types";

const svgNs = "http://www.w3.org/2000/svg";

export function svg<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("svg", svgNs, templateDefinition, children);
}
export function g<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("g", svgNs, templateDefinition, children);
}
export function circle<P>(templateDefinition?: TemplateDefinition<P>, children?: ChildrenOr<P>): BindingDefinition<any, any> {
    return TemplateFunction("circle", svgNs, templateDefinition, children);
}