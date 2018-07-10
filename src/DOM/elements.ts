import Component from "./Component/component";

export type ValueFunction<T> = T | ((c?: any, i?: number) => T);
export type ComponentDefinition<P, T> = ValueFunction<{ new (): Component<P, T> }>;
export type EventBindingMap = { [eventName: string]: { (): {(...args: any[]): void} } };

export type TemplateDefinition = IElementDefinition | IComponentDefinition | string;
export type TemplateValueFunction = ValueFunction<TemplateDefinition>;
export type TemplateValueFunctionMap<T> = {
    [K in keyof T]: TemplateValueFunction
}

export type TemplateFunction = (c?: any, i?: number) => TemplateDefinition;
export type TemplateFunctionMap<T> = {
    [K in keyof T]: TemplateFunction
}
export type TemplateDefinitions = TemplateDefinition | Array<TemplateDefinition>;
export type TemplateDefinitionsValueFunction = ValueFunction<TemplateDefinitions>;

export interface IElementDefinition {
    [elementName: string]: {};
    on?: EventBindingMap;
    data?: ValueFunction<{}>;
    rebind?: boolean;
    children?: TemplateDefinitionsValueFunction;
}

export interface IComponentDefinition {
    name: string;
    component: { new(): Component<any, any> };
    data?: ValueFunction<any>;
    templates?: TemplateValueFunctionMap<any>;
}

export interface IElementProperties {
    [propName: string]: {};
    on?: EventBindingMap;
    data?: {};
    rebind?: boolean;
    text?: ValueFunction<string>;
}

export function element(name: string, properties?: IElementProperties, children?: TemplateDefinitionsValueFunction): IElementDefinition {
    properties = properties || {};
    var elementDefinition: IElementDefinition = {
        on: properties.on,
        data: properties.data,
        rebind: properties.rebind,
        text: properties.text,
        children: children
    };
    delete properties.on;
    delete properties.data;
    delete properties.text;
    delete properties.rebind;
    elementDefinition[name] = properties;
    
    return elementDefinition;
}

export interface ElementMethod {
    (properties?: IElementProperties, children?: TemplateDefinitionsValueFunction): IElementDefinition
}

export function component<P, T>(component: { new(): Component<P, T> }, data?: ValueFunction<T>, templates?: TemplateValueFunctionMap<T> ): IComponentDefinition {
    return {
        name: (component as any as typeof Component).Name,
        component: component,
        data: data,
        templates: templates
    };
}

export interface ComponentMethod<P, T> {
    (data?: ValueFunction<P>, templates?: TemplateValueFunctionMap<T>): IComponentDefinition;
}
