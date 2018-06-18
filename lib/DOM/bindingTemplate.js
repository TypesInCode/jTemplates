"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = require("./browser");
const template_1 = require("./template");
const textBinding_1 = require("./Binding/textBinding");
const propertyBinding_1 = require("./Binding/propertyBinding");
const dataBinding_1 = require("./Binding/dataBinding");
const eventBinding_1 = require("./Binding/eventBinding");
const componentBinding_1 = require("./Binding/componentBinding");
var TemplateType;
(function (TemplateType) {
    TemplateType[TemplateType["Element"] = 0] = "Element";
    TemplateType[TemplateType["Text"] = 1] = "Text";
})(TemplateType || (TemplateType = {}));
function GetTemplateType(template) {
    if (typeof template === 'string' || typeof template.valueOf() === 'string')
        return TemplateType.Text;
    return TemplateType.Element;
}
function AppendText(text, node) {
    var textNode = browser_1.default.window.document.createTextNode("");
    node.appendChild(textNode);
    return new textBinding_1.default(textNode, text);
}
function ReadElementProperties(node, properties, parentProperties) {
    parentProperties = parentProperties || [];
    var bindings = [];
    for (var key in properties) {
        var value = properties[key];
        if (typeof value == 'object') {
            var childBindings = ReadElementProperties(node, value, [...parentProperties, key]);
            for (var x = 0; x < childBindings.length; x++)
                bindings.push(childBindings[x]);
        }
        else {
            bindings.push(new propertyBinding_1.default(node, [...parentProperties, key], value));
        }
    }
    return bindings;
}
function AppendElement(template, node) {
    var data = null;
    var children = null;
    var events;
    var component;
    var elementName = null;
    var properties = null;
    var templates = null;
    var text = null;
    for (var key in template) {
        switch (key) {
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
            case "name":
                elementName = template.name;
                break;
            case "text":
                text = template.text;
            default:
                elementName = key;
                properties = template[key];
                break;
        }
    }
    var elementNode = browser_1.default.window.document.createElement(elementName);
    node.appendChild(elementNode);
    var bindings = ReadElementProperties(elementNode, properties);
    for (var key in events)
        bindings.push(new eventBinding_1.default(elementNode, key, events[key]));
    if (component) {
        bindings.push(new componentBinding_1.default(elementNode, data, component, templates));
    }
    else if (text) {
        bindings.push(new textBinding_1.default(elementNode, text));
    }
    else if (children) {
        bindings.push(new dataBinding_1.default(elementNode, data, children));
    }
    return bindings;
}
function ReadBindingTemplate(template, rootNode, bindings) {
    if (!template)
        return [];
    if (!Array.isArray(template))
        template = [template];
    bindings = bindings || [];
    for (var x = 0; x < template.length; x++) {
        var tempObj = template[x];
        var type = GetTemplateType(tempObj);
        switch (type) {
            case TemplateType.Text:
                var textBinding = AppendText(tempObj, rootNode);
                if (textBinding)
                    bindings.push(textBinding);
                break;
            case TemplateType.Element:
                var elementBindings = AppendElement(tempObj, rootNode);
                for (var y = 0; y < elementBindings.length; y++)
                    bindings.push(elementBindings[y]);
                break;
        }
    }
    return bindings;
}
class BindingTemplate extends template_1.default {
    constructor(template) {
        var documentFragment = browser_1.default.createDocumentFragment();
        var bindings = ReadBindingTemplate(template, documentFragment);
        super(documentFragment);
        this.bindings = bindings;
    }
    AttachTo(element) {
        if (this.destroyed)
            throw "Cannot attach destroyed BindingTemplate";
        this.Bind();
        super.AttachTo(element);
    }
    Bind() {
        if (this.bound)
            return;
        this.bindings.forEach((c) => {
            c.Update();
        });
        this.bound = true;
    }
    Destroy() {
        this.Detach();
        this.bindings.forEach((c) => c.Destroy());
        this.destroyed = true;
    }
}
exports.BindingTemplate = BindingTemplate;
//# sourceMappingURL=bindingTemplate.js.map