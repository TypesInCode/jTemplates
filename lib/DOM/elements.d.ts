import Component from "./Component/component";
export declare type ValueFunction<T> = T | ((c?: any, i?: number) => T);
export declare type ComponentDefinition<P> = ValueFunction<{
    new (): Component<P>;
}>;
export declare type EventBindingMap = {
    [eventName: string]: (...args: any[]) => void;
};
export declare type BindingElementDefinition = IElementDefinition | IComponentDefinition | string;
export declare type BindingElementsDefinition = BindingElementDefinition | Array<BindingElementDefinition>;
export declare type BindingDefinition = ValueFunction<BindingElementsDefinition>;
export declare type TemplateDefinitionMap = {
    [name: string]: {
        (c?: any, i?: number): BindingElementsDefinition;
    };
};
export interface IElementDefinition {
    [elementName: string]: {};
    on?: EventBindingMap;
    data?: ValueFunction<{}>;
    children?: BindingDefinition;
}
export interface IComponentDefinition {
    name: string;
    component: {
        new (): Component<any>;
    };
    data?: ValueFunction<any>;
    templates?: TemplateDefinitionMap;
}
export interface IElementProperties {
    [propName: string]: {};
    on?: EventBindingMap;
    data?: {};
}
export declare function element(name: string, properties: IElementProperties, children?: BindingDefinition): IElementDefinition;
export interface ElementMethod {
    (properties: IElementProperties, children?: BindingDefinition): IElementDefinition;
}
export declare function component<T>(component: {
    new (): Component<T>;
}, data?: ValueFunction<T>, templates?: TemplateDefinitionMap): IComponentDefinition;
export interface ComponentMethod<T> {
    (data?: ValueFunction<T>, templates?: TemplateDefinitionMap): IComponentDefinition;
}
