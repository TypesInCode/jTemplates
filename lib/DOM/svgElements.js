"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("../Template/template");
const svgNs = "http://www.w3.org/2000/svg";
function svg(templateDefinition, children) {
    return template_1.TemplateFunction("svg", svgNs, templateDefinition, children);
}
exports.svg = svg;
function g(templateDefinition, children) {
    return template_1.TemplateFunction("g", svgNs, templateDefinition, children);
}
exports.g = g;
function circle(templateDefinition, children) {
    return template_1.TemplateFunction("circle", svgNs, templateDefinition, children);
}
exports.circle = circle;
//# sourceMappingURL=svgElements.js.map