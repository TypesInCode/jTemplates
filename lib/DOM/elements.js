"use strict";
function element(name, properties, children) {
    var elementDefinition = {
        on: properties.on,
        data: properties.data,
        children: children
    };
    delete properties.on;
    delete properties.data;
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