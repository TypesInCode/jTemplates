"use strict";
function element(name, properties, children) {
    var elementDefinition = {
        on: properties.events,
        data: properties.data,
        children: children
    };
    elementDefinition[name] = properties.props;
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