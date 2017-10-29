import browser from "./browser";
import Template from "./template";
import Component from "./Component/component";
import NodeBinding from "./Binding/nodeBinding";
import TextBinding from "./Binding/textBinding";
import PropertyBinding from "./Binding/propertyBinding";
import DataBinding from "./Binding/dataBinding";
import EventBinding from "./Binding/eventBinding";
import ComponentBinding from "./Binding/componentBinding";

export interface IBindingTemplate {
    [name: string]: { };
    text?: string | { (): string };
    component?: { (): { new (): Component } } | { new (): Component };
    templates?: { [name: string]: { (): IBindingTemplate | Array<IBindingTemplate> } | Array<IBindingTemplate> | IBindingTemplate };
    data?: { (): any } | any;
    children?: { (c?: any, i?: number): IBindingTemplate | Array<IBindingTemplate> } | Array<IBindingTemplate> | IBindingTemplate;
    on?: { [name: string]: { (): EventListener } };
}

enum TemplateType {
    Element,
    Text
}

function GetTemplateType(template: IBindingTemplate): TemplateType {
    if(template.text)
        return TemplateType.Text;

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

function AppendElement(template: IBindingTemplate, node: Node): Array<NodeBinding> {
    var data: any = null;
    var children:  { (c?: any, i?: number): IBindingTemplate | Array<IBindingTemplate> } | Array<IBindingTemplate> | IBindingTemplate = null;
    var events: { [name: string]: () => EventListener };
    var component: { new (): Component } | { (): { new (): Component } };
    var elementName: string = null;
    var properties: {} = null;
    var templates: { [name: string]: { (): IBindingTemplate | Array<IBindingTemplate> } | Array<IBindingTemplate> | IBindingTemplate } = null;
    for(var key in template) {
        switch(key) {
            case "children":
                children = template.children;
                break;
            case "data":
                data = template.data;
                break;
            case "on":
                events = template.on;
                break;
            case "component":
                component = template.component;
                break;
            case "templates":
                templates = template.templates;
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

    if(component) {
        bindings.push(new ComponentBinding(elementNode, data, component, templates));
    }
    else if(children) {
        bindings.push(new DataBinding(elementNode, data, children));
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
    private updatingBindings: Array<NodeBinding>;
    private updatingCallback: (binding: NodeBinding) => void;
    private updatedCallback: (binding: NodeBinding) => void;

    constructor(template: IBindingTemplate | Array<IBindingTemplate>) {
        var documentFragment = browser.createDocumentFragment();
        var bindings = ReadBindingTemplate(template, documentFragment);
        super(documentFragment);

        this.bindings = bindings;
        this.updatingBindings = [];
        this.updatingCallback = this.Updating.bind(this);
        this.updatedCallback = this.Updated.bind(this);
    }

    public AttachTo(element: Node) {
        if(this.destroyed)
            throw "Cannot attach destroyed BindingTemplate";

        this.Bind();        
        super.AttachTo(element);
    }

    public Bind() {
        if(this.bound)
            return;
        
        this.bindings.forEach((c) => {
            c.AddListener("updating", this.updatingCallback)
            c.AddListener("updated", this.updatedCallback)
            c.Update();
        });
        this.bound = true;
    }

    public Destroy(): void {
        this.ClearAll();
        this.Detach();
        this.bindings.forEach((c) => c.Destroy());
        this.destroyed = true;
    }

    protected Updating(binding: NodeBinding) {
        var index = this.updatingBindings.indexOf(binding);
        if(index < 0)
            this.updatingBindings.push(binding);

        if(this.updatingBindings.length == 1 && index < 0)
            this.Fire("updating", this);
    }

    protected Updated(binding: NodeBinding) {
        var index = this.updatingBindings.indexOf(binding);
        if(index >= 0)
            this.updatingBindings.splice(index, 1);

        if(this.updatingBindings.length == 0)
            this.Fire("updated", this);
    }
}