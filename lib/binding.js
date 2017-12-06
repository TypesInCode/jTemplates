"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var observableScope_1 = require("./Observable/observableScope");
var emitter_1 = require("./emitter");
var BindingStatus;
(function (BindingStatus) {
    BindingStatus[BindingStatus["Init"] = 0] = "Init";
    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
})(BindingStatus || (BindingStatus = {}));
var Binding = (function (_super) {
    __extends(Binding, _super);
    function Binding(boundTo, binding, scheduleUpdate) {
        _super.call(this);
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.status = BindingStatus.Init;
        this.setCallback = this.Update.bind(this);
        if (typeof binding == 'function')
            this.observableScope = new observableScope_1.default(binding);
        else
            this.observableScope = new observableScope_1.default(function () { return binding; });
        this.observableScope.AddListener("set", this.setCallback);
    }
    Object.defineProperty(Binding.prototype, "Value", {
        get: function () {
            return this.observableScope.Value;
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
        if (this.status != BindingStatus.Init) {
            this.Updating();
            this.scheduleUpdate(function () {
                _this.Apply();
                _this.Updated();
            });
        }
        else {
            this.Apply();
            this.status = BindingStatus.Updated;
        }
    };
    Binding.prototype.Destroy = function () {
        this.ClearAll();
        this.observableScope.Destroy();
    };
    Binding.prototype.Updating = function () {
        if (this.status != BindingStatus.Updating) {
            this.Fire("updating");
            this.status = BindingStatus.Updating;
        }
    };
    Binding.prototype.Updated = function () {
        if (this.status != BindingStatus.Updated) {
            this.Fire("updated");
            this.status = BindingStatus.Updated;
        }
    };
    return Binding;
}(emitter_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Binding;
//# sourceMappingURL=binding.js.map