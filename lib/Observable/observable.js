"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var emitter_1 = require("../emitter");
var jsonTreeNode_1 = require("./jsonTreeNode");
var sharedEmitter = new emitter_1.default();
var Observable = (function (_super) {
    __extends(Observable, _super);
    function Observable() {
        _super.apply(this, arguments);
    }
    Observable.prototype.GetSourceNode = function () {
        return this._sourceNode;
    };
    Observable.prototype.SetSourceNode = function (sourceNode) {
        this._sourceNode = sourceNode;
    };
    Observable.prototype.SetValue = function (value) {
        value = Observable.Unwrap(value);
        this._sourceNode.SetValue(value);
    };
    Observable.prototype.NodeUpdated = function () {
        this.Fire("set");
    };
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
            this._sourceNode.SetValue(obs);
            return;
        }
        obs.GetSourceNode().AddMirrorNode(this);
        this.Fire("set");
    };
    Observable.prototype.UnJoin = function () {
        this.GetSourceNode().RemoveMirroredNode(this);
    };
    Observable.prototype.Destroy = function () {
        this.ClearAll();
    };
    Observable.prototype.valueOf = function () {
        this.Fire("get");
        return this._sourceNode.GetMirroredValue(this);
    };
    Observable.prototype.toString = function () {
        var value = this.valueOf();
        return value && value.toString();
    };
    return Observable;
}(emitter_1.default));
var Observable;
(function (Observable) {
    function Create(initialValue) {
        return jsonTreeNode_1.JsonTreeNode.Create(initialValue, Observable);
    }
    Observable.Create = Create;
    function Unwrap(value) {
        if (value instanceof Observable)
            return value.GetSourceNode().GetRawValue();
        if (Array.isArray(value))
            return value.map(function (c) { return Observable.Unwrap(c); });
        var returnValue = {};
        for (var key in value)
            returnValue[key] = Observable.Unwrap(value[key]);
        return returnValue;
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
//# sourceMappingURL=observable.js.map