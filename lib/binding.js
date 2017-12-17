"use strict";
var observableScope_1 = require("./Observable/observableScope");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
})(BindingStatus || (BindingStatus = {}));
var Binding = (function () {
    function Binding(boundTo, binding, scheduleUpdate) {
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        if (typeof binding == 'function') {
            this.hasStaticValue = false;
            this.observableScope = new observableScope_1.default(binding);
            this.observableScope.AddListener("set", this.setCallback);
        }
        else {
            this.hasStaticValue = true;
            this.staticValue = binding;
        }
    }
    Object.defineProperty(Binding.prototype, "Value", {
        get: function () {
            return this.hasStaticValue ? this.staticValue : this.observableScope.Value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Binding.prototype, "BoundTo", {
        get: function () {
            return this.boundTo;
        },
        enumerable: true,
        configurable: true
    });
    Binding.prototype.Update = function () {
        var _this = this;
        if (this.status == BindingStatus.Updated) {
            this.scheduleUpdate(function () {
                _this.Apply();
            });
        }
        else if (this.status == BindingStatus.Init) {
            this.status = BindingStatus.Updating;
            this.Apply();
            this.status = BindingStatus.Updated;
        }
    };
    Binding.prototype.Destroy = function () {
        this.observableScope && this.observableScope.Destroy();
    };
    return Binding;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Binding;
//# sourceMappingURL=binding.js.map