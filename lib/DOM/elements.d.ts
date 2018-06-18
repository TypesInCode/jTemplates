import Component from "./Component/component";
export declare type ValueFunction<T> = T | ((c?: any, i?: number) => T);
export declare type ComponentDefinition<P, T> = ValueFunction<{
    new (): Component<P, T>;
}>;
export declare type EventBindingMap = {
    [eventName: string]: {
        (): {
            (...args: any[]): void;
        };
    };
};
export declare type TemplateDefinition = IElementDefinition | IComponentDefinition | string;
export declare type TemplateValueFunction = ValueFunction<TemplateDefinition>;
export declare type TemplateValueFunctionMap<T> = {
    [K in keyof T]: TemplateValueFunction;
};
export declare type TemplateFunction = (c?: any, i?: number) => TemplateDefinition;
export declare type TemplateFunctionMap<T> = {
    [K in keyof T]: TemplateFunction;
};
export declare type TemplateDefinitions = TemplateDefinition | Array<TemplateDefinition>;
export declare type TemplateDefinitionsValueFunction = ValueFunction<TemplateDefinitions>;
export interface IElementDefinition {
    [elementName: string]: {};
    on?: EventBindingMap;
    data?: ValueFunction<{}>;
    children?: TemplateDefinitionsValueFunction;
}
export interface IComponentDefinition {
    name: string;
    component: {
        new (): Component<any, any>;
    };
    data?: ValueFunction<any>;
    templates?: TemplateValueFunctionMap<any>;
}
export interface IElementProperties {
    [propName: string]: {};
    on?: EventBindingMap;
    data?: {};
    text?: ValueFunction<string>;
}
export declare function element(name: string, properties?: IElementProperties, children?: TemplateDefinitionsValueFunction): IElementDefinition;
export interface ElementMethod {
    (properties?: IElementProperties, children?: TemplateDefinitionsValueFunction): IElementDefinition;
}
export declare function component<P, T>(component: {
    new (): Component<P, T>;
}, data?: ValueFunction<T>, templates?: TemplateValueFunctionMap<T>): IComponentDefinition;
export interface ComponentMethod<P, T> {
    (data?: ValueFunction<P>, templates?: TemplateValueFunctionMap<T>): IComponentDefinition;
}
