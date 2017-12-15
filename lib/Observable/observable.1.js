"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var emitter_1 = require("../emitter");
var observableValue_1 = require("./observableValue");
var sharedEmitter = new emitter_1.default();
var Observable = (function (_super) {
    __extends(Observable, _super);
    function Observable(initialValue) {
        _super.call(this);
        this.observableValue = new observableValue_1.ObservableValue();
        this.observableValue.AddNode(this);
        this.SetValue(initialValue);
    }
    Object.defineProperty(Observable.prototype, "IsArray", {
        get: function () {
            return Array.isArray(this.observableValue.valueOf());
        },
        enumerable: true,
        configurable: true
    });
    Observable.prototype.Fire = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        _super.prototype.Fire.apply(this, [name].concat(args));
        sharedEmitter.Fire.apply(sharedEmitter, [name, this].concat(args));
    };
    Observable.prototype.Join = function (obs) {
        if (!(obs instanceof Observable)) {
            this.SetValue(obs);
            return;
        }
        var newVal = obs.GetObservableValue();
        this.observableValue.Join(newVal);
    };
    Observable.prototype.SetValue = function (value) {
        if (value instanceof Observable)
            value = Observable.Unwrap(value);
        this.observableValue.Value = value;
    };
    Observable.prototype.ResetValue = function (value) {
        this.observableValue.RemoveNode(this);
        this.observableValue = new observableValue_1.ObservableValue();
        this.observableValue.AddNode(this);
        this.SetValue(value);
    };
    Observable.prototype.GetObservableValue = function () {
        return this.observableValue;
    };
    Observable.prototype.SetObservableValue = function (val) {
        this.observableValue = val;
    };
    Observable.prototype.Destroy = function () {
        this.ClearAll();
        this.observableValue.Destroy();
    };
    Observable.prototype.valueOf = function () {
        this.Fire("get");
        return this.observableValue.valueOf();
    };
    Observable.prototype.toString = function () {
        return this.valueOf().toString();
    };
    return Observable;
}(emitter_1.default));
var Observable;
(function (Observable) {
    function Create(initialValue) {
        return new Observable(initialValue);
    }
    Observable.Create = Create;
    function Unwrap(node) {
        return observableValue_1.ObservableValue.Unwrap(node.GetObservableValue());
    }
    Observable.Unwrap = Unwrap;
    function Watch(event, action) {
        var ret = [];
        var callback = function (sender, obs) {
            var ind = ret.indexOf(obs);
            if (ind < 0)
                ret.push(obs);
        };
        sharedEmitter.AddListener(event, callback);
        action();
        sharedEmitter.RemoveListener(event, callback);
        return ret;
    }
    Observable.Watch = Watch;
})(Observable || (Observable = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Observable;
//# sourceMappingURL=observable.1.js.map