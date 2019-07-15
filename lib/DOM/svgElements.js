"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("../Template/template");
function svg(templateDefinition, children) {
    return template_1.TemplateFunction("svg", "http://www.w3.org/2000/svg", templateDefinition, children);
}
exports.svg = svg;
function g(templateDefinition, children) {
    return template_1.TemplateFunction("g", "http://www.w3.org/2000/svg", templateDefinition, children);
}
exports.g = g;
function circle(templateDefinition, children) {
    return template_1.TemplateFunction("circle", "http://www.w3.org/2000/svg", templateDefinition, children);
}
exports.circle = circle;
//# sourceMappingURL=svgElements.js.map