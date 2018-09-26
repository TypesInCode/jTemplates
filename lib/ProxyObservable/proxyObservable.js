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
    constructor() { }
    get Value() {
        return this.getValue();
    }
    set Value(val) {
        this.setValue(val);
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
class DynamicValue extends Value {
    constructor(valuePath) {
        super();
        this.valuePath = valuePath;
    }
    getValue() {
        var emitter = emitterMap.get(this.valuePath);
        globalEmitter.emit("get", emitter);
        return valueMap.get(this.valuePath);
    }
    setValue(val) {
        valueMap.set(this.valuePath, val);
        emitterMap.get(this.valuePath).emit("set");
    }
}
class StaticValue extends Value {
    constructor(value) {
        super();
        this.value = value;
        this.emitter = new emitter_1.Emitter();
    }
    getValue() {
        globalEmitter.emit("get", this.emitter);
        return this.value;
    }
    setValue(val) {
        this.value = val;
        this.emitter.emit("set");
    }
}
(function (Value) {
    function Create(valueFunction) {
        var val = null;
        var emitters = ProxyObservable.Watch(() => val = valueFunction());
        var emitter = emitters[emitters.length - 1];
        if (emitter)
            return new DynamicValue(emitter.emitterPath);
        return new StaticValue(val);
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
    var disableGetEvent = false;
    function CreateProxy(parentPath, initValue) {
        var proxy = new Proxy(initValue, {
            get: function (obj, prop) {
                if (disableGetEvent || typeof prop !== 'string')
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
                    obj[prop] = FromObject(val, propPath, obj[prop]);
                }
                emitterMap.get(propPath).emit("set");
                if (isArray && arrayLength != obj.length) {
                    emitterMap.get(`${parentPath}.length`).emit('set');
                    emitterMap.get(parentPath) && emitterMap.get(parentPath).emit('set');
                }
                return true;
            }
        });
        return proxy;
    }
    function FromObject(value, proxyPath, proxy) {
        var proxy = !IsValue(proxy) ? proxy : CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        if (Array.isArray(value)) {
            var lengthPath = `${proxyPath}.length`;
            emitterMap.set(lengthPath, emitterMap.get(lengthPath) || new ProxyObservableEmitter(lengthPath));
            if (proxy.length > value.length)
                proxy.splice(value.length);
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
    function DestroyRecursive(parent, path) {
        if (!parent || typeof parent !== 'object')
            return;
        for (var key in parent) {
            var childPath = `${path}.${key}`;
            emitterMap.delete(childPath);
            valueMap.delete(childPath);
            DestroyRecursive(parent[key], childPath);
        }
    }
    var destroyTimeout;
    var destroyQueue = [];
    function ProcessDestroyQueue() {
        for (var x = 0; x < destroyQueue.length; x++) {
            var obj = destroyQueue[x];
            var id = rootObjectMap.get(obj);
            if (!id)
                throw "Key not found in rootObjectMap";
            rootObjectMap.delete(obj);
            disableGetEvent = true;
            DestroyRecursive(obj, id);
            disableGetEvent = false;
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