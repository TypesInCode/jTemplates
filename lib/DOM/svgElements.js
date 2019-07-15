"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("../Template/template");
function svg(templateDefinition, children) {
    return template_1.TemplateFunction("svg", templateDefinition, children);
}
exports.svg = svg;
function g(templateDefinition, children) {
    return template_1.TemplateFunction("g", templateDefinition, children);
}
exports.g = g;
function circle(templateDefinition, children) {
    return template_1.TemplateFunction("circle", templateDefinition, children);
}
exports.circle = circle;
//# sourceMappingURL=svgElements.js.map