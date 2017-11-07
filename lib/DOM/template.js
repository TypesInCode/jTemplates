"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var browser_1 = require("./browser");
var emitter_1 = require("../emitter");
var Template = (function (_super) {
    __extends(Template, _super);
    function Template(documentFragment) {
        _super.call(this);
        this.documentFragment = documentFragment;
        this.elements = new Array(this.documentFragment.childNodes.length);
        for (var x = 0; x < this.documentFragment.childNodes.length; x++) {
            this.elements.push(this.documentFragment.childNodes[x]);
        }
    }
    Object.defineProperty(Template.prototype, "DocumentFragment", {
        get: function () {
            return this.documentFragment;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Template.prototype, "Attached", {
        get: function () {
            return !!this.attachedTo;
        },
        enumerable: true,
        configurable: true
    });
    Template.prototype.AttachTo = function (element) {
        if (this.attachedTo)
            this.Detach();
        this.attachedTo = element;
        element.appendChild(this.documentFragment);
    };
    Template.prototype.Detach = function () {
        var _this = this;
        if (!this.Attached)
            return;
        this.attachedTo = null;
        this.elements.forEach(function (c) {
            return _this.documentFragment.appendChild(c);
        });
    };
    Template.prototype.Clone = function () {
        if (this.Attached)
            throw "Template cannot be cloned while attached";
        var fragment = this.documentFragment.cloneNode(true);
        return new Template(fragment);
    };
    return Template;
}(emitter_1.default));
var Template;
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