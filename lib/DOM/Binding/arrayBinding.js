"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var template_1 = require("../template");
var browser_1 = require("../browser");
var observable_1 = require("../../Observable/observable");
var attributeBinding_1 = require("./attributeBinding");
var componentSimple_1 = require("../Component/componentSimple");
var arrayRgx = /j-array/;
var ArrayBinding = (function (_super) {
    __extends(ArrayBinding, _super);
    function ArrayBinding(element, parameters) {
        _super.call(this, element, "j-array", parameters);
        this.template = template_1.default.Create(this.BoundTo);
        this.childComponents = [];
        this.indexObservables = observable_1.default.Create([]);
    }
    Object.defineProperty(ArrayBinding.prototype, "BindsChildren", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    ArrayBinding.prototype.Apply = function () {
        var currentLength = this.childComponents.length;
        var newValue = this.Value || [];
        if (currentLength > newValue.length) {
            var oldComponents = this.childComponents.splice(newValue.length);
            oldComponents.forEach(function (c) {
                c.Destroy();
            });
        }
        else {
            var frag = browser_1.default.createDocumentFragment();
            for (var x = currentLength; x < newValue.length; x++) {
                var params = {};
                params["$index"] = x;
                var newComponent = new componentSimple_1.default(this.template, newValue[x], params);
                newComponent.AttachTo(frag);
                this.childComponents.push(newComponent);
            }
            this.BoundTo.appendChild(frag);
        }
    };
    return ArrayBinding;
}(attributeBinding_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ArrayBinding;
//# sourceMappingURL=arrayBinding.js.map