"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
var globalEmitter = new emitter_1.Emitter();
var rootProxyId = 0;
var emitterMap = new Map();
var valueMap = new Map();
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
        var emitter = emitterMap.get(this.valuePath);
        globalEmitter.emit("get", emitter);
        return valueMap.get(this.valuePath);
    }
    set Value(val) {
        valueMap.set(this.valuePath, val);
        emitterMap.get(this.valuePath).emit("set");
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
                var emitter = emitterMap.get(propPath);
                emitter && globalEmitter.emit("get", emitter);
                if (valueMap.get(propPath) === undefined)
                    return obj[prop];
                return valueMap.get(propPath);
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
                emitterMap.set(propPath, emitterMap.get(propPath) || new ProxyObservableEmitter(propPath));
                if (valueMap.get(propPath) === val && !(isArray && prop === 'length'))
                    return true;
                if (IsValue(val)) {
                    valueMap.set(propPath, obj[prop] = val);
                }
                else {
                    valueMap.delete(propPath);
                    obj[prop] = FromObject(val, propPath);
                }
                emitterMap.get(propPath).emit("set");
                if (isArray && arrayLength != obj.length && prop != 'length') {
                    emitterMap.get(`${parentPath}.length`).emit('set');
                    emitterMap.get(parentPath) && emitterMap.get(parentPath).emit('set');
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
            emitterMap.set(lengthPath, emitterMap.get(lengthPath) || new ProxyObservableEmitter(lengthPath));
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
    var destroyTimeout;
    var destroyQueue = [];
    function ProcessDestroyQueue() {
        for (var x = 0; x < destroyQueue.length; x++) {
            var obj = destroyQueue[x];
            var id = rootObjectMap.get(obj);
            id = `${id}.`;
            if (!id)
                throw "Key not found in rootObjectMap";
            rootObjectMap.delete(obj);
            var keys = [];
            var keyIterator = emitterMap.keys();
            var current = null;
            while ((current = keyIterator.next()) && !current.done)
                if (current.value.startsWith(id))
                    keys.push(current.value);
            keys.forEach(key => emitterMap.delete(key));
            keys = [];
            keyIterator = valueMap.keys();
            current = null;
            while ((current = keyIterator.next()) && !current.done)
                if (current.value.startsWith(id))
                    keys.push(current.value);
            keys.forEach(key => valueMap.delete(key));
        }
        destroyQueue = [];
    }
    function Destroy(obj) {
        destroyQueue.push(obj);
        clearTimeout(destroyTimeout);
        destroyTimeout = setTimeout(ProcessDestroyQueue, 500);
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