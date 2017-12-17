import Component from "./Component/component";

export type ValueFunction<T> = T | ((c?: any, i?: number) => T);
export type ComponentDefinition<P> = ValueFunction<{ new (): Component<P> }>;
export type EventBindingMap = { [eventName: string]: { (): {(...args: any[]): void} } };

export type BindingElementDefinition = IElementDefinition | IComponentDefinition | string;
export type BindingElementsDefinition = BindingElementDefinition | Array<BindingElementDefinition>;
export type BindingDefinition = ValueFunction<BindingElementsDefinition>;
//export type BindingDefinitionMap = { [name: string]: BindingDefinition };
export type TemplateDefinitionMap = { [name: string]: BindingDefinition };

export interface IElementDefinition {
    [elementName: string]: {};
    on?: EventBindingMap;
    data?: ValueFunction<{}>;
    children?: BindingDefinition;
}

export interface IComponentDefinition {
    name: string;
    component: { new(): Component<any> };
    data?: ValueFunction<any>;
    templates?: TemplateDefinitionMap;
}

export interface IElementProperties {
    [propName: string]: {};
    on?: EventBindingMap;
    data?: {}
}

export function element(name: string, properties: IElementProperties, children?: BindingDefinition): IElementDefinition {
    var elementDefinition: IElementDefinition = {
        on: properties.on,
        data: properties.data,
        children: children
    };
    delete properties.on;
    delete properties.data;
    elementDefinition[name] = properties;
    
    return elementDefinition;
}

export interface ElementMethod {
    (properties: IElementProperties, children?: BindingDefinition): IElementDefinition
}

export function component<T>(component: { new(): Component<T> }, data?: ValueFunction<T>, templates?: TemplateDefinitionMap ): IComponentDefinition {
    return {
        name: (component as any as typeof Component).Name,
        component: component,
        data: data,
        templates: templates
    };
}

export interface ComponentMethod<T> {
    (data?: ValueFunction<T>, templates?: TemplateDefinitionMap): IComponentDefinition;
}
