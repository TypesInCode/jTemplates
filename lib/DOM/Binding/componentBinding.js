"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var browser_1 = require("../browser");
var component_1 = require("../Component/component");
var ComponentBinding = (function (_super) {
    __extends(ComponentBinding, _super);
    function ComponentBinding(element, parameters) {
        var documentFragment = browser_1.default.createDocumentFragment(element);
        var childFragments = {};
        for (var x = 0; x < documentFragment.childNodes.length; x++) {
            var node = documentFragment.childNodes[x];
            childFragments[node.nodeName] = browser_1.default.createDocumentFragment(node);
        }
        var expression = element.getAttribute("j-parent");
        _super.call(this, element, function () { return null; });
        var compType = component_1.default.Get(this.BoundTo.nodeName);
        this.component = new compType();
        this.component.SetChildElements(childFragments);
    }
    Object.defineProperty(ComponentBinding.prototype, "BindsChildren", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    ComponentBinding.prototype.Apply = function () {
        this.component.SetParentData(this.Value);
        if (!this.component.Attached)
            this.component.AttachTo(this.BoundTo);
    };
    return ComponentBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentBinding;
//# sourceMappingURL=componentBinding.js.map