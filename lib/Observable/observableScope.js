"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var emitter_1 = require("../emitter");
var observable_1 = require("./observable");
var ObservableScope = (function (_super) {
    __extends(ObservableScope, _super);
    function ObservableScope(observableFunction) {
        _super.call(this);
        this.observableFunction = observableFunction;
        this.childObservables = [];
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    Object.defineProperty(ObservableScope.prototype, "Value", {
        get: function () {
            this.Fire("get", this);
            if (!this.dirty)
                return this.value;
            this.UpdateValue();
            return this.value;
        },
        enumerable: true,
        configurable: true
    });
    ObservableScope.prototype.Destroy = function () {
        var _this = this;
        this.ClearAll();
        for (var x = 0; x < this.childObservables.length; x++)
            this.childObservables.forEach(function (c) { return _this.RemoveListeners(c); });
    };
    ObservableScope.prototype.UpdateValue = function () {
        var _this = this;
        var newObservables = observable_1.default.Watch("get", function () {
            _this.value = _this.observableFunction();
            if (_this.value instanceof observable_1.default)
                _this.value = _this.value.valueOf();
        });
        for (var x = 0; x < newObservables.length; x++) {
            var ind = this.childObservables.indexOf(newObservables[x]);
            if (ind < 0)
                this.AddListeners(newObservables[x]);
            else
                this.childObservables.splice(ind, 1);
        }
        for (var y = 0; y < this.childObservables.length; y++)
            this.RemoveListeners(this.childObservables[y]);
        this.childObservables = newObservables;
        this.dirty = false;
    };
    ObservableScope.prototype.SetCallback = function (observable) {
        this.dirty = true;
        this.Fire("set");
    };
    ObservableScope.prototype.AddListeners = function (observable) {
        observable.AddListener("set", this.setCallback);
    };
    ObservableScope.prototype.RemoveListeners = function (observable) {
        observable.RemoveListener("set", this.setCallback);
    };
    return ObservableScope;
}(emitter_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ObservableScope;
//# sourceMappingURL=observableScope.js.map