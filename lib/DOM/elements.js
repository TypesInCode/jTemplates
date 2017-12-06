"use strict";
function element(name, properties, events, data, children) {
    var elementDefinition = {
        on: events,
        data: data,
        children: children
    };
    elementDefinition[name] = properties;
    return elementDefinition;
}
exports.element = element;
exports.div = element.bind(null, "div");
exports.span = element.bind(null, "span");
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