"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elementNode_1 = require("../Node/elementNode");
function div(nodeDef, children) {
    return elementNode_1.ElementNode.Create("div", null, nodeDef, children);
}
exports.div = div;
function a(nodeDef, children) {
    return elementNode_1.ElementNode.Create("a", null, nodeDef, children);
}
exports.a = a;
function ul(nodeDef, children) {
    return elementNode_1.ElementNode.Create("ul", null, nodeDef, children);
}
exports.ul = ul;
function li(nodeDef, children) {
    return elementNode_1.ElementNode.Create("li", null, nodeDef, children);
}
exports.li = li;
function br(nodeDef) {
    return elementNode_1.ElementNode.Create("br", null, nodeDef, null);
}
exports.br = br;
function b(nodeDef) {
    return elementNode_1.ElementNode.Create("b", null, nodeDef);
}
exports.b = b;
function span(nodeDef, children) {
    return elementNode_1.ElementNode.Create("span", null, nodeDef, children);
}
exports.span = span;
function img(nodeDef) {
    return elementNode_1.ElementNode.Create("img", null, nodeDef, null);
}
exports.img = img;
function video(nodeDef, children) {
    return elementNode_1.ElementNode.Create("video", null, nodeDef, children);
}
exports.video = video;
function source(nodeDef) {
    return elementNode_1.ElementNode.Create("source", null, nodeDef, null);
}
exports.source = source;
function input(nodeDef) {
    nodeDef.immediate = true;
    return elementNode_1.ElementNode.Create("input", null, nodeDef, null);
}
exports.input = input;
function select(nodeDef, children) {
    return elementNode_1.ElementNode.Create("select", null, nodeDef, children);
}
exports.select = select;
function option(nodeDef) {
    return elementNode_1.ElementNode.Create("option", null, nodeDef, null);
}
exports.option = option;
function h1(nodeDef) {
    return elementNode_1.ElementNode.Create("h1", null, nodeDef, null);
}
exports.h1 = h1;
function h2(nodeDef) {
    return elementNode_1.ElementNode.Create("h2", null, nodeDef, null);
}
exports.h2 = h2;
function h3(nodeDef) {
    return elementNode_1.ElementNode.Create("h3", null, nodeDef, null);
}
exports.h3 = h3;
function p(nodeDef, children) {
    return elementNode_1.ElementNode.Create("p", null, nodeDef, children);
}
exports.p = p;
function style(nodeDef, children) {
    return elementNode_1.ElementNode.Create("style", null, nodeDef, children);
}
exports.style = style;
function button(nodeDef, children) {
    return elementNode_1.ElementNode.Create("button", null, nodeDef, children);
}
exports.button = button;
