"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
var globalEmitter = new emitter_1.Emitter();
var rootProxyId = 0;
var emitterMap = {};
var valueMap = {};
var rootObjectMap = new Map();
class ProxyObservableEmitter extends emitter_1.Emitter {
    constructor(emitterPath) {
        super();
        this.emitterPath = emitterPath;
    }
}
class Value {
    constructor(valuePath) {
        this.valuePath = valuePath;
    }
    get Value() {
        var emitter = emitterMap[this.valuePath];
        globalEmitter.emit("get", emitter);
        return valueMap[this.valuePath];
    }
    set Value(val) {
        valueMap[this.valuePath] = val;
        emitterMap[this.valuePath].emit("set");
    }
    toString() {
        var val = this.Value;
        return val && val.toString();
    }
    valueOf() {
        var val = this.Value;
        return val && val.valueOf();
    }
}
exports.Value = Value;
(function (Value) {
    function Create(valueFunction) {
        var emitters = ProxyObservable.Watch(valueFunction);
        var emitter = emitters[emitters.length - 1];
        return new Value(emitter.emitterPath);
    }
    Value.Create = Create;
})(Value = exports.Value || (exports.Value = {}));
var ProxyObservable;
(function (ProxyObservable) {
    function IsValue(value) {
        if (!value)
            return true;
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
    }
    function CreateProxy(parentPath, initValue) {
        var proxy = new Proxy(initValue, {
            get: function (obj, prop) {
                if (typeof prop !== 'string')
                    return obj[prop];
                var propPath = `${parentPath}.${prop}`;
                var emitter = emitterMap[propPath];
                emitter && globalEmitter.emit("get", emitter);
                if (typeof valueMap[propPath] === 'undefined')
                    return obj[prop];
                return valueMap[propPath];
            },
            set: function (obj, prop, val) {
                if (typeof prop !== 'string') {
                    obj[prop] = val;
                    return true;
                }
                var isArray = Array.isArray(obj);
                var arrayLength = null;
                if (isArray)
                    arrayLength = obj.length;
                var propPath = `${parentPath}.${prop}`;
                emitterMap[propPath] = emitterMap[propPath] || new ProxyObservableEmitter(propPath);
                if (valueMap[propPath] === val && !(isArray && prop === 'length'))
                    return true;
                if (IsValue(val)) {
                    valueMap[propPath] = obj[prop] = val;
                }
                else {
                    delete valueMap[propPath];
                    obj[prop] = FromObject(val, propPath);
                }
                emitterMap[propPath].emit("set");
                if (isArray && arrayLength != obj.length && prop != 'length') {
                    emitterMap[`${parentPath}.length`].emit('set');
                    emitterMap[parentPath] && emitterMap[parentPath].emit('set');
                }
                return true;
            }
        });
        return proxy;
    }
    function FromObject(value, proxyPath) {
        var proxy = CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        if (Array.isArray(value)) {
            var lengthPath = `${proxyPath}.length`;
            emitterMap[lengthPath] = emitterMap[lengthPath] || new ProxyObservableEmitter(lengthPath);
        }
        for (var key in value)
            proxy[key] = value[key];
        return proxy;
    }
    function Create(value) {
        if (IsValue(value))
            throw "Only arrays and JSON types are supported";
        var id = (++rootProxyId).toString();
        var obj = FromObject(value, id);
        rootObjectMap.set(obj, id);
        return obj;
    }
    ProxyObservable.Create = Create;
    function Destroy(obj) {
        var id = rootObjectMap.get(obj);
        if (!id)
            throw "Key not found in rootObjectMap";
        rootObjectMap.delete(obj);
        var keys = [];
        for (var key in emitterMap)
            if (key.startsWith(id))
                keys.push(key);
        keys.forEach(key => delete emitterMap[key]);
        keys = [];
        for (var key in valueMap)
            if (key.startsWith(id))
                keys.push(key);
        keys.forEach(key => delete valueMap[key]);
    }
    ProxyObservable.Destroy = Destroy;
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