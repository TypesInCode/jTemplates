"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
var ValueType;
(function (ValueType) {
    ValueType[ValueType["Unknown"] = 0] = "Unknown";
    ValueType[ValueType["Value"] = 1] = "Value";
    ValueType[ValueType["Object"] = 2] = "Object";
    ValueType[ValueType["Array"] = 3] = "Array";
})(ValueType = exports.ValueType || (exports.ValueType = {}));
var JsonObj = {};
function GetValueType(value) {
    if (Array.isArray(value))
        return ValueType.Array;
    if (value && typeof value === "object" && value.constructor === JsonObj.constructor)
        return ValueType.Object;
    return ValueType.Value;
}
class ObservableValue {
    get ObservableReference() {
        return this.__observableReference;
    }
    constructor(parent) {
        this.__observableReference = parent;
    }
    valueOf() {
        return this.ObservableReference.Value;
    }
    toString() {
        var val = this.ObservableReference.Value;
        return val && val.toString();
    }
}
exports.ObservableValue = ObservableValue;
var sharedEmitter = new emitter_1.default();
class Observable extends emitter_1.default {
    get Properties() {
        return this._properties.values();
    }
    get Type() {
        return this._valueType;
    }
    get Value() {
        this.Fire("get");
        return this._value;
    }
    set Value(val) {
        if (this._joinedObservable) {
            this._joinedObservable.Value = val;
            return;
        }
        if (val instanceof ObservableValue)
            val = Observable.Unwrap(val);
        else if (val instanceof Observable)
            val = Observable.Unwrap(val.ObservableValue);
        if (this._value !== val) {
            this.ReconcileRawValue(val);
            this.Fire("set");
        }
    }
    get ObservableValue() {
        return this._observableValue;
    }
    constructor(value) {
        super();
        this._valueType = ValueType.Unknown;
        this._properties = new Set();
        this._setCallback = this.SetCallback.bind(this);
        this._observableValue = new ObservableValue(this);
        if (value != undefined)
            this.Value = value;
    }
    Fire(name, ...args) {
        super.Fire(name, ...args);
        sharedEmitter.Fire(name, this, ...args);
    }
    Join(observable) {
        if (this._joinedObservable === observable)
            return;
        if (this._joinedObservable)
            this.Unjoin();
        if (observable instanceof ObservableValue)
            observable = observable.ObservableReference;
        else if (!(observable instanceof Observable)) {
            this.Value = observable;
            return;
        }
        this._joinedObservable = observable;
        this._joinedObservable.AddListener("set", this._setCallback);
        this.ReconcileJoinedObservable(observable);
        this.Fire("set");
    }
    Unjoin() {
        if (!this._joinedObservable)
            return;
        for (var prop in this.Properties) {
            var obsValue = this._value[prop];
            obsValue.ObservableReference.Unjoin();
        }
        this._joinedObservable.RemoveListener("set", this._setCallback);
        this._joinedObservable = null;
    }
    Destroy() {
        this.ClearAll();
        this.DeleteProperties([...this.Properties]);
    }
    SetCallback(observable) {
        this.ReconcileJoinedObservable(observable);
        this.Fire("set");
    }
    ConvertToType(newType) {
        if (this._valueType === newType)
            return;
        this.DeleteProperties([...this._properties]);
        this._properties.clear();
        this._valueType = newType;
        switch (this._valueType) {
            case ValueType.Array:
                this._value = [];
                this.AddArrayMixin();
                break;
            case ValueType.Object:
                this._value = {};
                this.RemoveArrayMixin();
                break;
            case ValueType.Value:
                this.RemoveArrayMixin();
                break;
        }
    }
    ReconcileJoinedObservable(observable) {
        this.ConvertToType(observable.Type);
        var properties = new Set([...observable.Properties]);
        if (observable.Type === ValueType.Value)
            this._value = observable.Value;
        var removedProperties = [...this._properties].filter(c => !properties.has(c));
        properties.forEach(prop => {
            var childObservable = Observable.GetFrom(observable.Value[prop]);
            if (this._properties.has(prop))
                Observable.GetFrom(this._value[prop]).Join(childObservable);
            else
                this._value[prop] = this.DefineProperty(prop, childObservable);
        });
        this.DeleteProperties(removedProperties);
        this._properties = properties;
    }
    ReconcileRawValue(value) {
        var type = GetValueType(value);
        this.ConvertToType(type);
        var properties = new Set();
        if (type === ValueType.Array) {
            for (var x = 0; x < value.length; x++)
                properties.add(x);
        }
        else if (type === ValueType.Object) {
            for (var key in value)
                properties.add(key);
        }
        else if (type === ValueType.Value)
            this._value = value;
        var removedProperties = [...this._properties].filter(c => !properties.has(c));
        properties.forEach(prop => {
            if (this._properties.has(prop))
                this.ObservableValue[prop] = value[prop];
            else
                this._value[prop] = this.DefineProperty(prop, value[prop]);
        });
        this.DeleteProperties(removedProperties);
        this._properties = properties;
    }
    DefineProperty(prop, value) {
        var childObservable = new Observable();
        childObservable.Join(value);
        Object.defineProperty(this.ObservableValue, prop, {
            get: () => childObservable.ObservableValue,
            set: (val) => childObservable.Value = val,
            enumerable: true,
            configurable: true
        });
        return childObservable.ObservableValue;
    }
    DeleteProperties(properties) {
        if (this.Type === ValueType.Array) {
            for (var x = this._value.length - properties.length; x < this._value.length; x++) {
                this._value[x].ObservableReference.Destroy();
                delete this.ObservableValue[this._value.length - properties.length + x];
            }
            this._value.splice(this._value.length - properties.length);
        }
        else {
            properties.forEach(prop => {
                var obsValue = this._value[prop];
                obsValue.ObservableReference.Destroy();
                delete this.ObservableValue[prop];
                delete this._value[prop];
            });
        }
    }
    AddArrayMixin() {
        Object.defineProperty(this.ObservableValue, "length", {
            get: () => this.Value.length,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "push", {
            value: (newValue) => {
                this._value.push(this.DefineProperty(this._value.length, newValue));
                this._properties.add(this._properties.size);
                this.Fire("set");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "join", {
            value: (separator) => {
                return this.Value.join(separator);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "map", {
            value: (callback) => {
                return this.Value.map(callback);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "filter", {
            value: (callback) => {
                return this.Value.filter(callback);
            },
            enumerable: false,
            configurable: true
        });
    }
    RemoveArrayMixin() {
        delete this.ObservableValue["length"];
        delete this.ObservableValue["push"];
        delete this.ObservableValue["join"];
        delete this.ObservableValue["map"];
        delete this.ObservableValue["filter"];
    }
}
exports.Observable = Observable;
(function (Observable) {
    function Unwrap(value) {
        if (!(value instanceof ObservableValue))
            return value;
        var obs = value.ObservableReference;
        var returnValue = obs.Type === ValueType.Value ? value.valueOf() :
            obs.Type === ValueType.Array ? [] : {};
        for (var prop of obs.Properties) {
            returnValue[prop] = Unwrap(value[prop]);
        }
        return returnValue;
    }
    Observable.Unwrap = Unwrap;
    function Create(value) {
        return (new Observable(value)).ObservableValue;
    }
    Observable.Create = Create;
    function Watch(event, action) {
        var ret = new Set();
        var callback = (sender, obs) => {
            if (!ret.has(obs))
                ret.add(obs);
        };
        sharedEmitter.AddListener(event, callback);
        action();
        sharedEmitter.RemoveListener(event, callback);
        return ret.values();
    }
    Observable.Watch = Watch;
    function GetFrom(value) {
        if (value instanceof ObservableValue)
            return value.ObservableReference;
        return null;
    }
    Observable.GetFrom = GetFrom;
})(Observable = exports.Observable || (exports.Observable = {}));
//# sourceMappingURL=observable.js.map