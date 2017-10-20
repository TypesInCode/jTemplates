"use strict";
var observable_1 = require("./Observable/observable");
var Binding = (function () {
    function Binding(boundTo, binding, scheduleUpdate) {
        var _this = this;
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.applyCallback = function () { _this.Apply(); };
        if (typeof binding == 'function') {
            this.observables = [];
            this.setCallback = function (obs) { _this.Update(); };
            this.bindingFunction = binding;
            this.staticBinding = false;
        }
        else {
            this.value = binding;
            this.staticBinding = true;
        }
    }
    Object.defineProperty(Binding.prototype, "BindsChildren", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
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
    Binding.prototype.Destroy = function () {
        var _this = this;
        this.observables.forEach(function (c) {
            c.RemoveListener("set", _this.setCallback);
        });
        this.value = null;
    };
    Binding.prototype.AddListeners = function (observable) {
        observable.AddListener("set", this.setCallback);
    };
    Binding.prototype.RemoveListeners = function (observable) {
        observable.RemoveListener("set", this.setCallback);
    };
    Binding.prototype.ScheduleUpdate = function (updateCallback) {
        this.scheduleUpdate(updateCallback);
    };
    Binding.prototype.Update = function () {
        var _this = this;
        if (this.staticBinding) {
            this.ScheduleUpdate(this.applyCallback);
            return;
        }
        var obs = observable_1.default.Watch("get", function () {
            _this.value = _this.bindingFunction();
            if (_this.value)
                _this.value = _this.value.valueOf();
        });
        var curObs = this.observables;
        for (var x = 0; x < obs.length; x++) {
            var ind = curObs.indexOf(obs[x]);
            if (ind < 0) {
                this.AddListeners(obs[x]);
            }
            else
                curObs.splice(ind, 1);
        }
        for (var y = 0; y < curObs.length; y++) {
            this.RemoveListeners(curObs[y]);
        }
        this.observables = obs;
        this.ScheduleUpdate(this.applyCallback);
    };
    return Binding;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Binding;
//# sourceMappingURL=binding.js.map