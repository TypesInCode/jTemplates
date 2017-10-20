import browser from "./browser";
import Template from "./template";
import Component from "./Component/component";
import NodeBinding from "./Binding/nodeBinding";
import TextBinding from "./Binding/textBinding";
import PropertyBinding from "./Binding/propertyBinding";
import DataBinding from "./Binding/dataBinding";
import EventBinding from "./Binding/eventBinding";

export interface IBindingTemplate {
    [name: string]: { };
    text?: string | { (): string };
    component?: typeof Component;
    data?: { (): any } | any;
    children?: { (c?: any, i?: number): Array<IBindingTemplate> } | { (c?: any, i?: number): IBindingTemplate } | Array<IBindingTemplate> | IBindingTemplate;
    on?: { [name: string]: { (): EventListener } };
}

enum TemplateType {
    Element,
    Text,
    Component
}

function GetTemplateType(template: IBindingTemplate): TemplateType {
    if(template.text)
        return TemplateType.Text;
    
    if(template.component)
        return TemplateType.Component;

    return TemplateType.Element;
}

function AppendText(template: IBindingTemplate, node: Node): NodeBinding {
    var text = template.text;
    var textNode = browser.window.document.createTextNode("");
    node.appendChild(textNode);
    return new TextBinding(textNode, text);
}

function ReadElementProperties(node: Node, properties: {}, parentProperties?: Array<string>): Array<NodeBinding> {
    parentProperties = parentProperties || [];
    var bindings: Array<NodeBinding> = [];

    for(var key in properties) {
        var value = (properties as any)[key];
        if(typeof value == 'object') {
            var childBindings = ReadElementProperties(node, value, [...parentProperties, key]);
            for(var x=0; x<childBindings.length; x++)
                bindings.push(childBindings[x]);
        }
        else {
            bindings.push(new PropertyBinding(node, [...parentProperties, key], value));
        }
    }

    return bindings;
}

function CreateEventBinding(node: Node, event: string, callback:(e: EventListenerObject) => void) {
    var func = () => callback;
    return new EventBinding(node, event, func);
}

function AppendElement(template: IBindingTemplate, node: Node): Array<NodeBinding> {
    var data: any = null;
    var childrenTemplate:  { (c?: any, i?: number): Array<IBindingTemplate> } | { (c?: any, i?: number): IBindingTemplate } | Array<IBindingTemplate> | IBindingTemplate = null;
    var events: { [name: string]: () => EventListener };
    var elementName: string = null;
    var properties: {} = null;
    for(var key in template) {
        switch(key) {
            case "children":
                childrenTemplate = template.children;
                break;
            case "data":
                data = template.data;
                break;
            case "on":
                events = template.on;
                break;
            default:
                elementName = key;
                properties = template[key];
                break;
        }
    }

    var elementNode = browser.window.document.createElement(elementName);
    node.appendChild(elementNode);
    var bindings = ReadElementProperties(elementNode, properties);

    for(var key in events)
        bindings.push(new EventBinding(elementNode, key, events[key]))

    if(childrenTemplate) {
        bindings.push(new DataBinding(elementNode, data, childrenTemplate));
    }

    return bindings;
}

function ReadBindingTemplate(template: Array<IBindingTemplate> | IBindingTemplate, rootNode: Node, bindings?: Array<NodeBinding>): Array<NodeBinding> {
    if(!template)
        return [];

    if(!Array.isArray(template))
        template = [template];
    
    bindings = bindings || [];

    for(var x=0; x<template.length; x++) {
        var tempObj = template[x];
        var type = GetTemplateType(tempObj);
        switch(type) {
            case TemplateType.Text:
                var textBinding = AppendText(tempObj, rootNode);
                if(textBinding)
                    bindings.push(textBinding);
                break;
            case TemplateType.Element:
                var elementBindings = AppendElement(tempObj, rootNode);
                for(var y=0; y<elementBindings.length; y++)
                    bindings.push(elementBindings[y]);
                break;
        }
    }

    return bindings;
}

export class BindingTemplate extends Template {
    private bindings: Array<NodeBinding>;
    private destroyed: boolean;
    private bound: boolean;

    constructor(template: IBindingTemplate | Array<IBindingTemplate>) {
        var documentFragment = browser.createDocumentFragment();
        var bindings = ReadBindingTemplate(template, documentFragment);
        super(documentFragment);

        this.bindings = bindings;
    }

    public AttachTo(element: Node) {
        if(!this.bound) {
            this.bindings.forEach((c) => c.Update());
            this.bound = true;
        }
        
        super.AttachTo(element);
    }

    public Destroy(): void {
        this.Detach();
        this.bindings.forEach((c) => c.Destroy());
        this.destroyed = true;
    }
}