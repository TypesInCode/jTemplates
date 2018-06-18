"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function element(name, properties, children) {
    properties = properties || {};
    var elementDefinition = {
        on: properties.on,
        data: properties.data,
        text: properties.text,
        children: children
    };
    delete properties.on;
    delete properties.data;
    delete properties.text;
    elementDefinition[name] = properties;
    return elementDefinition;
}
exports.element = element;
function component(component, data, templates) {
    return {
        name: component.Name,
        component: component,
        data: data,
        templates: templates
    };
}
exports.component = component;
//# sourceMappingURL=elements.js.map