"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var TextBinding = (function (_super) {
    __extends(TextBinding, _super);
    function TextBinding(element, binding) {
        _super.call(this, element, binding);
    }
    TextBinding.prototype.Apply = function () {
        this.BoundTo.textContent = this.Value;
    };
    return TextBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TextBinding;
//# sourceMappingURL=textBinding.js.map