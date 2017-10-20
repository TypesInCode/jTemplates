"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var componentBase_1 = require("./componentBase");
var Component = (function (_super) {
    __extends(Component, _super);
    function Component() {
        _super.call(this);
        this.SetTemplate(this.Template);
    }
    Object.defineProperty(Component, "Name", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Component.prototype, "Template", {
        get: function () { },
        enumerable: true,
        configurable: true
    });
    Component.prototype.SetParentData = function (data) {
        this.parentData = data;
    };
    Component.prototype.BindingParameters = function () {
        var params = _super.prototype.BindingParameters.call(this);
        params["$parent"] = this.parentData;
        return params;
    };
    Component.toString = function () {
        Component.Register(this);
        return this.Name;
    };
    return Component;
}(componentBase_1.default));
var Component;
(function (Component) {
    var componentMap = {};
    function Register(constructor) {
        var name = constructor.Name.toLowerCase();
        var comp = componentMap[name];
        if (!comp)
            componentMap[name] = constructor;
    }
    Component.Register = Register;
    function Get(name) {
        var comp = componentMap[name.toLowerCase()];
        return comp;
    }
    Component.Get = Get;
    function Exists(name) {
        return !!Get(name);
    }
    Component.Exists = Exists;
})(Component || (Component = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Component;
//# sourceMappingURL=component.js.map