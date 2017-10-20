"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var AttributeBinding = (function (_super) {
    __extends(AttributeBinding, _super);
    function AttributeBinding(element, attributeName, parameters) {
        _super.call(this, element, function () { return null; });
        this.attributeName = attributeName;
    }
    AttributeBinding.prototype.Apply = function () {
        this.BoundTo.setAttribute(this.attributeName, this.Value);
    };
    return AttributeBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttributeBinding;
//# sourceMappingURL=attributeBinding.js.map