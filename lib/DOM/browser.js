"use strict";
var glbl = null;
if (typeof window != "undefined")
    glbl = window;
else {
    glbl = (new (require("jsdom").JSDOM)("")).window;
}
function ImmediateRequestAnimationFrame(callback) {
    callback();
    return 0;
}
var immediateAnimationFrames = false;
var selfClosingTagRgx = /<([^\s]+)([^>]*)\/>/g;
function CreateDocumentFragment(node) {
    if (typeof node === "string") {
        node = node.replace(selfClosingTagRgx, function (substr, g1, g2) {
            return "<" + g1 + g2 + "></" + g1 + ">";
        });
        var parser = new glbl.DOMParser();
        var doc = parser.parseFromString(node, "text/html");
        return CreateDocumentFragment(doc.body);
    }
    var fragment = glbl.document.createDocumentFragment();
    while (node && node.childNodes.length > 0)
        fragment.appendChild(node.childNodes[0]);
    return fragment;
}
var config = {
    window: glbl,
    get immediateAnimationFrames() {
        return immediateAnimationFrames;
    },
    set immediateAnimationFrames(val) {
        immediateAnimationFrames = val;
        this.requestAnimationFrame = (immediateAnimationFrames ? ImmediateRequestAnimationFrame : glbl.requestAnimationFrame || ImmediateRequestAnimationFrame).bind(glbl);
    },
    requestAnimationFrame: null,
    createDocumentFragment: CreateDocumentFragment
};
config.immediateAnimationFrames = false;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = config;
//# sourceMappingURL=browser.js.map