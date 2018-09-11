"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
var ProxyObservable;
(function (ProxyObservable) {
    var globalEmitter = new emitter_1.Emitter();
    var rootProxyId = 0;
    var emitterMap = {};
    var valueMap = {};
    class Value {
        constructor(parent, path, prop) {
            this.parent = parent;
            this.path = path;
            this.prop = prop;
        }
        get value() {
            var value = this.parent[this.prop];
            return value && value.__getRealValue();
        }
        __getRealValue() {
            return valueMap[`${this.path}.${this.prop}`];
        }
        toString() {
            return this.value && this.value.toString();
        }
        valueOf() {
            return this.value && this.value.valueOf();
        }
    }
    ProxyObservable.Value = Value;
    function IsValue(value) {
        if (!value)
            return true;
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
    }
    function GetValue(value) {
        if (value && value.__getRealValue)
            return value.__getRealValue();
        return value;
    }
    function WrapValue(parent, path, prop, value) {
        valueMap[`${path}.${prop}`] = value;
        if (typeof value === 'function') {
            var func = function () {
                var value = parent[prop];
                if (!value)
                    return;
                var func = value.__getRealValue();
                func.apply(this, arguments);
            };
            func.__getRealValue = function () {
                return valueMap[`${path}.${prop}`];
            };
            return func;
        }
        else {
            return new Value(parent, path, prop);
        }
    }
    function CreateProxy(proxyPath, initValue) {
        var proxy = new Proxy(initValue, {
            get: function (obj, prop) {
                if (typeof prop !== 'string')
                    return obj[prop];
                var proxyId = `${proxyPath}.${prop}`;
                var emitter = emitterMap[proxyId];
                emitter && globalEmitter.emit("get", emitter);
                return obj[prop];
            },
            set: function (obj, prop, val) {
                var isArray = Array.isArray(obj);
                if (typeof prop !== 'string') {
                    obj[prop] = val;
                    return true;
                }
                var propPath = `${proxyPath}.${prop}`;
                emitterMap[propPath] = emitterMap[propPath] || new emitter_1.Emitter();
                if (obj[prop] === val && !(isArray && prop === 'length'))
                    return true;
                if (IsValue(val) && !(isArray && prop === 'length'))
                    obj[prop] = WrapValue(proxy, proxyPath, prop, GetValue(val));
                else if (isArray && prop === 'length')
                    obj[prop] = val;
                else
                    obj[prop] = FromObject(val, propPath);
                emitterMap[propPath].emit("set");
                if (isArray && prop === 'length')
                    emitterMap[proxyPath].emit("set");
                return true;
            }
        });
        return proxy;
    }
    function FromObject(value, proxyPath) {
        var proxy = CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        if (Array.isArray(value)) {
            emitterMap[`${proxyPath}.length`] = emitterMap[`${proxyPath}.length`] || new emitter_1.Emitter();
        }
        for (var key in value)
            proxy[key] = value[key];
        return proxy;
    }
    function Create(value) {
        if (IsValue(value))
            throw "Only arrays and JSON types are supported";
        return FromObject(value, (++rootProxyId).toString());
    }
    ProxyObservable.Create = Create;
    function Watch(callback) {
        var emitters = new Set();
        globalEmitter.addListener("get", (emitter) => {
            if (!emitters.has(emitter))
                emitters.add(emitter);
        });
        callback();
        globalEmitter.removeAllListeners();
        return [...emitters];
    }
    ProxyObservable.Watch = Watch;
})(ProxyObservable = exports.ProxyObservable || (exports.ProxyObservable = {}));
//# sourceMappingURL=proxyObservable.js.map