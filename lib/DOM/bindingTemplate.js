"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var browser_1 = require("./browser");
var template_1 = require("./template");
var textBinding_1 = require("./Binding/textBinding");
var propertyBinding_1 = require("./Binding/propertyBinding");
var dataBinding_1 = require("./Binding/dataBinding");
var eventBinding_1 = require("./Binding/eventBinding");
var TemplateType;
(function (TemplateType) {
    TemplateType[TemplateType["Element"] = 0] = "Element";
    TemplateType[TemplateType["Text"] = 1] = "Text";
    TemplateType[TemplateType["Component"] = 2] = "Component";
})(TemplateType || (TemplateType = {}));
function GetTemplateType(template) {
    if (template.text)
        return TemplateType.Text;
    if (template.component)
        return TemplateType.Component;
    return TemplateType.Element;
}
function AppendText(template, node) {
    var text = template.text;
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
            var childBindings = ReadElementProperties(node, value, parentProperties.concat([key]));
            for (var x = 0; x < childBindings.length; x++)
                bindings.push(childBindings[x]);
        }
        else {
            bindings.push(new propertyBinding_1.default(node, parentProperties.concat([key]), value));
        }
    }
    return bindings;
}
function CreateEventBinding(node, event, callback) {
    var func = function () { return callback; };
    return new eventBinding_1.default(node, event, func);
}
function AppendElement(template, node) {
    var data = null;
    var childrenTemplate = null;
    var events;
    var elementName = null;
    var properties = null;
    for (var key in template) {
        switch (key) {
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
    var elementNode = browser_1.default.window.document.createElement(elementName);
    node.appendChild(elementNode);
    var bindings = ReadElementProperties(elementNode, properties);
    for (var key in events)
        bindings.push(new eventBinding_1.default(elementNode, key, events[key]));
    if (childrenTemplate) {
        bindings.push(new dataBinding_1.default(elementNode, data, childrenTemplate));
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
var BindingTemplate = (function (_super) {
    __extends(BindingTemplate, _super);
    function BindingTemplate(template) {
        var documentFragment = browser_1.default.createDocumentFragment();
        var bindings = ReadBindingTemplate(template, documentFragment);
        _super.call(this, documentFragment);
        this.bindings = bindings;
    }
    BindingTemplate.prototype.AttachTo = function (element) {
        if (!this.bound) {
            this.bindings.forEach(function (c) { return c.Update(); });
            this.bound = true;
        }
        _super.prototype.AttachTo.call(this, element);
    };
    BindingTemplate.prototype.Destroy = function () {
        this.Detach();
        this.bindings.forEach(function (c) { return c.Destroy(); });
        this.destroyed = true;
    };
    return BindingTemplate;
}(template_1.default));
exports.BindingTemplate = BindingTemplate;
//# sourceMappingURL=bindingTemplate.js.map