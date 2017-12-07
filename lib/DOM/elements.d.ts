import Component from "./Component/component";
export declare type ValueFunction<T> = T | ((...args: any[]) => T);
export declare type ComponentDefinition<P> = ValueFunction<{
    new (): Component<P>;
}>;
export declare type EventBindingMap = {
    [eventName: string]: {
        (): EventListener;
    };
};
export declare type BindingElementDefinition = IElementDefinition | IComponentDefinition | string;
export declare type BindingElementsDefinition = BindingElementDefinition | Array<BindingElementDefinition>;
export declare type BindingDefinition = ValueFunction<BindingElementsDefinition>;
export declare type BindingDefinitionMap = {
    [name: string]: BindingDefinition;
};
export declare type TemplateDefinitionMap = {
    [name: string]: BindingElementDefinition;
};
export interface IElementDefinition {
    [elementName: string]: {};
    on?: EventBindingMap;
    data?: ValueFunction<{}>;
    children?: BindingDefinition;
}
export interface IComponentDefinition {
    name: string;
    component: ComponentDefinition<any>;
    data?: ValueFunction<any>;
    templates?: BindingDefinitionMap;
}
export interface IElementProperties {
    props?: {};
    events?: EventBindingMap;
    data?: {};
}
export declare function element(name: string, properties: IElementProperties, children?: BindingDefinition): IElementDefinition;
export interface ElementMethod {
    (properties: IElementProperties, children?: BindingDefinition): IElementDefinition;
}
export declare function component<T>(component: {
    new (): Component<T>;
}, data: T, templates: TemplateDefinitionMap): IComponentDefinition;
