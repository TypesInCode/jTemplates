"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var emitter_1 = require("../emitter");
(function (ValueType) {
    ValueType[ValueType["Unknown"] = 0] = "Unknown";
    ValueType[ValueType["Value"] = 1] = "Value";
    ValueType[ValueType["Object"] = 2] = "Object";
    ValueType[ValueType["Array"] = 3] = "Array";
})(exports.ValueType || (exports.ValueType = {}));
var ValueType = exports.ValueType;
var JsonObj = {};
function GetValueType(value) {
    if (Array.isArray(value))
        return ValueType.Array;
    if (value && typeof value === "object" && value.constructor === JsonObj.constructor)
        return ValueType.Object;
    return ValueType.Value;
}
function GetNewValues(oldValues, newValues) {
    var uniqueValues = [];
    for (var x = 0; x < newValues.length; x++) {
        var v = newValues[x];
        if (oldValues.indexOf(v) < 0)
            uniqueValues.push(v);
    }
    return uniqueValues;
}
function GetOldValues(oldValues, newValues) {
    var uniqueValues = [];
    for (var x = 0; x < oldValues.length; x++) {
        var v = oldValues[x];
        if (newValues.indexOf(v) < 0)
            uniqueValues.push(v);
    }
    return uniqueValues;
}
var sharedEmitter = new emitter_1.default();
var Observable = (function (_super) {
    __extends(Observable, _super);
    function Observable(initialValue) {
        _super.call(this);
        this._value = null;
        this._valueType = ValueType.Unknown;
        this._properties = [];
        this._setCallback = this.SetCallback.bind(this);
        if (initialValue)
            this.SetValue(initialValue);
    }
    Observable.prototype.GetProperties = function () {
        return this._properties;
    };
    Observable.prototype.GetType = function () {
        return this._valueType;
    };
    Observable.prototype.GetValue = function () {
        this.Fire("get");
        return this._value;
    };
    Observable.prototype.SetValue = function (value) {
        if (this._sourceObservable) {
            this._sourceObservable.SetValue(value);
            return;
        }
        if (value instanceof Observable)
            value = Observable.Unwrap(value);
        this.ReconcileValue(value);
        this.Fire("set");
    };
    Observable.prototype.Join = function (observable) {
        if (!(observable instanceof Observable)) {
            this.SetValue(observable);
            return;
        }
        for (var x = 0; x < this._properties.length; x++) {
            var prop = this._properties[x];
            this[prop].Join(observable[prop]);
        }
        this.ReconcileObservable(observable);
        if (this._sourceObservable)
            this._sourceObservable.RemoveListener("set", this._setCallback);
        this._sourceObservable = observable;
        this._sourceObservable.AddListener("set", this._setCallback);
        this.Fire("set");
    };
    Observable.prototype.UnJoin = function () {
        if (!this._sourceObservable)
            return;
        this._sourceObservable.RemoveListener("set", this._setCallback);
        this._sourceObservable = null;
    };
    Observable.prototype.Destroy = function () {
        this.ClearAll();
        this.UnJoin();
    };
    Observable.prototype.Fire = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        _super.prototype.Fire.apply(this, [name].concat(args));
        sharedEmitter.Fire.apply(sharedEmitter, [name, this].concat(args));
    };
    Observable.prototype.valueOf = function () {
        return this.GetValue();
    };
    Observable.prototype.toString = function () {
        var value = this.valueOf();
        return value || value.toString();
    };
    Observable.prototype.SetCallback = function (observable) {
        this.ReconcileObservable(observable);
        this.Fire("set");
    };
    Observable.prototype.ReconcileValue = function (value) {
        var type = GetValueType(value);
        this.ConvertToType(type);
        var properties = [];
        if (type === ValueType.Array) {
            value = value;
            for (var x = 0; x < value.length; x++)
                properties.push(x);
        }
        else if (type === ValueType.Object) {
            for (var key in value)
                properties.push(key);
        }
        this.ReconcileProperties(properties, type, value);
    };
    Observable.prototype.ReconcileObservable = function (observable) {
        var type = observable.GetType();
        this.ConvertToType(type);
        var properties = observable.GetProperties().slice();
        this.ReconcileProperties(properties, type, observable);
    };
    Observable.prototype.ConvertToType = function (newType) {
        if (this._valueType === newType)
            return;
        this.RemoveProperties(this._properties);
        this._properties = [];
        this._valueType = newType;
        switch (this._valueType) {
            case ValueType.Array:
                this._value = [];
                break;
            case ValueType.Object:
                this._value = {};
                break;
        }
    };
    Observable.prototype.ReconcileProperties = function (properties, type, value) {
        var removedProperties = GetOldValues(this._properties, properties);
        var addedProperties = GetNewValues(this._properties, properties);
        this._properties = properties;
        this.RemoveProperties(removedProperties);
        this.AddProperties(addedProperties, value);
        if (type === ValueType.Value)
            this._value = value && value.valueOf();
    };
    Observable.prototype.RemoveProperties = function (properties) {
        for (var x = 0; x < properties.length; x++) {
            var p = properties[x];
            var obs = this._value[p];
            obs.Destroy();
            delete this._value[p];
            delete this[p];
        }
    };
    Observable.prototype.AddProperties = function (properties, value) {
        for (var x = 0; x < properties.length; x++) {
            var p = properties[x];
            this.DefineProperty(p, value[p]);
        }
    };
    Observable.prototype.DefineProperty = function (property, value) {
        var _this = this;
        var newObservable = new Observable();
        if (value instanceof Observable)
            newObservable.Join(value);
        else
            newObservable.SetValue(value);
        this._value[property] = newObservable;
        Object.defineProperty(this, property, {
            get: function () { return _this._value[property]; },
            set: function (val) { return _this._value[property].SetValue(val); },
            enumerable: true,
            configurable: true
        });
    };
    return Observable;
}(emitter_1.default));
var Observable;
(function (Observable) {
    function Create(initialValue) {
        return new Observable(initialValue);
    }
    Observable.Create = Create;
    function Unwrap(observable) {
        var type = observable.GetType();
        var value = type === ValueType.Value ? observable.valueOf() :
            type === ValueType.Array ? [] : {};
        var properties = observable.GetProperties();
        for (var x = 0; x < properties[x]; x++) {
            var p = properties[x];
            value[p] = Unwrap(observable[p]);
        }
        return value;
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