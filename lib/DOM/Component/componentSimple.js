"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var componentBase_1 = require("./componentBase");
var ComponentSimple = (function (_super) {
    __extends(ComponentSimple, _super);
    function ComponentSimple(template, data, parameterOverrides) {
        _super.call(this);
        this.data = data;
        this.parameterOverrides = parameterOverrides;
        this.SetTemplate(template);
    }
    Object.defineProperty(ComponentSimple.prototype, "Data", {
        get: function () {
            return this.data;
        },
        enumerable: true,
        configurable: true
    });
    ComponentSimple.prototype.BindingParameters = function () {
        var params = _super.prototype.BindingParameters.call(this);
        for (var key in this.parameterOverrides)
            params[key] = this.parameterOverrides[key];
        params["$data"] = this.Data;
        return params;
    };
    return ComponentSimple;
}(componentBase_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComponentSimple;
//# sourceMappingURL=componentSimple.js.map