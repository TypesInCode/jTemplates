"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var observable_1 = require("./Observable/observable");
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
        this.bindingInitialized = false;
        this.status = BindingStatus.Init;
        this.observables = [];
        this.setCallback = this.Update.bind(this);
        if (typeof binding == 'function')
            this.bindingFunction = binding;
        else
            this.value = binding;
    }
    Object.defineProperty(Binding.prototype, "Value", {
        get: function () {
            return this.value;
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
        if (this.bindingFunction) {
            var obs = observable_1.default.Watch("get", function () {
                _this.value = _this.bindingFunction();
                if (_this.value)
                    _this.value = _this.value.valueOf();
            });
            var curObs = this.observables;
            for (var x = 0; x < obs.length; x++) {
                var ind = curObs.indexOf(obs[x]);
                if (ind < 0)
                    this.AddListeners(obs[x]);
                else
                    curObs.splice(ind, 1);
            }
            for (var y = 0; y < curObs.length; y++) {
                this.RemoveListeners(curObs[y]);
            }
            this.observables = obs;
        }
        if (this.bindingInitialized) {
            this.Updating();
            this.scheduleUpdate(function () {
                _this.Apply();
                _this.Updated();
            });
        }
        else {
            this.Apply();
            this.bindingInitialized = true;
        }
    };
    Binding.prototype.Destroy = function () {
        var _this = this;
        this.ClearAll();
        this.observables.forEach(function (c) {
            _this.RemoveListeners(c);
        });
        this.value = null;
    };
    Binding.prototype.AddListeners = function (observable) {
        observable.AddListener("set", this.setCallback);
    };
    Binding.prototype.RemoveListeners = function (observable) {
        observable.RemoveListener("set", this.setCallback);
    };
    Binding.prototype.Updating = function () {
        if (this.status != BindingStatus.Updating) {
            this.Fire("updating", this);
            this.status = BindingStatus.Updating;
        }
    };
    Binding.prototype.Updated = function () {
        if (this.status != BindingStatus.Updated) {
            this.Fire("updated", this);
            this.status = BindingStatus.Updated;
        }
    };
    return Binding;
}(emitter_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Binding;
//# sourceMappingURL=binding.js.map