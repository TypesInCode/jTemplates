"use strict";
const browser_1 = require("./browser");
class Template {
    constructor(documentFragment) {
        this.documentFragment = documentFragment;
        this.elements = new Array(this.documentFragment.childNodes.length);
        for (var x = 0; x < this.documentFragment.childNodes.length; x++) {
            this.elements.push(this.documentFragment.childNodes[x]);
        }
    }
    get DocumentFragment() {
        return this.documentFragment;
    }
    get Attached() {
        return !!this.attachedTo;
    }
    get AttachedTo() {
        return this.attachedTo;
    }
    AttachTo(element) {
        if (this.attachedTo)
            this.Detach();
        this.attachedTo = element;
        element.appendChild(this.documentFragment);
    }
    Detach() {
        if (!this.Attached)
            return;
        this.attachedTo = null;
        this.elements.forEach(c => this.documentFragment.appendChild(c));
    }
    Clone() {
        if (this.Attached)
            throw "Template cannot be cloned while attached";
        var fragment = this.documentFragment.cloneNode(true);
        return new Template(fragment);
    }
}
(function (Template) {
    function Create(template) {
        if (template instanceof Template)
            return template.Clone();
        var frag = browser_1.default.createDocumentFragment(template);
        return new Template(frag);
    }
    Template.Create = Create;
})(Template || (Template = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Template;
//# sourceMappingURL=template.js.map