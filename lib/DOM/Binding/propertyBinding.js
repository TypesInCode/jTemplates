"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var nodeBinding_1 = require("./nodeBinding");
var PropertyBinding = (function (_super) {
    __extends(PropertyBinding, _super);
    function PropertyBinding(boundTo, propertyPath, bindingFunction) {
        _super.call(this, boundTo, bindingFunction);
        this.parentObject = this.BoundTo;
        var x = 0;
        for (; x < propertyPath.length - 1; x++)
            this.parentObject = this.parentObject[propertyPath[x]];
        this.propName = propertyPath[x];
    }
    PropertyBinding.prototype.Apply = function () {
        this.parentObject[this.propName] = this.Value;
    };
    return PropertyBinding;
}(nodeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PropertyBinding;
//# sourceMappingURL=propertyBinding.js.map