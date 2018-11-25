"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
function IsValue(value) {
    if (!value)
        return true;
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
}
var globalEmitter = new emitter_1.default();
class ObjectStoreEmitter extends emitter_1.default {
    constructor(___path) {
        super();
        this.___path = ___path;
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
class StoreValue extends Value {
    constructor(store, valuePath) {
        super();
        this.store = store;
        this.valuePath = valuePath;
    }
    getValue() {
        var emitter = this.store.GetEmitter(this.valuePath);
        globalEmitter.emit("get", emitter);
        return this.store.GetValue(this.valuePath);
    }
    setValue(val) {
        this.store.SetValue(this.valuePath, val);
        this.store.GetEmitter(this.valuePath).emit("set");
    }
}
class LoneValue extends Value {
    constructor(value) {
        super();
        this.value = value;
        this.emitter = new emitter_1.default();
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
class ObjectStore {
    constructor(idCallback) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new ObjectStoreEmitter("root"));
        this.getterMap = new Map();
        this.idToPathsMap = new Map();
    }
    get Root() {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }
    set Root(val) {
        this.Write(null, () => val);
    }
    Get(id) {
        var paths = this.idToPathsMap.get(id);
        if (!paths)
            return null;
        var path = paths.values().next().value;
        var value = this.ResolvePropertyPath(path);
        return this.CreateGetterObject(value, path);
    }
    GetEmitter(path) {
        return this.emitterMap.get(path);
    }
    GetValue(path) {
        var value = this.ResolvePropertyPath(path);
        if (!IsValue(value))
            throw `Store path: ${path} does not resolve to a value type`;
        return value;
    }
    SetValue(path, value) {
        if (!IsValue(value))
            throw `Can only set value types by path`;
        this.WriteTo(path, path, value);
    }
    Value(valueFunction) {
        var emitters = ObjectStore.Watch(() => valueFunction());
        var emitter = emitters[emitters.length - 1];
        if (emitter && emitter === this.emitterMap.get(emitter.___path))
            return new StoreValue(this, emitter.___path);
        throw `Invalid value expression. ${emitter ? 'Found emitter does not belong to this store.' : 'No emitters found.'}`;
    }
    Write(readOnly, updateCallback) {
        if (typeof readOnly === 'string')
            readOnly = this.Get(readOnly);
        var path = readOnly ? readOnly.___path : "root";
        var localValue = this.ResolvePropertyPath(path);
        var mutableCopy = this.CreateCopy(localValue);
        var newValue = updateCallback(mutableCopy);
        this.WriteTo(path, path, typeof newValue !== "undefined" ? newValue : mutableCopy);
        ;
    }
    WriteTo(rootPath, path, value, skipDependents) {
        var localValue = this.ResolvePropertyPath(path);
        if (localValue === value)
            return;
        this.AssignPropertyPath(value, path);
        this.ProcessChanges(rootPath, path, value, localValue, skipDependents);
    }
    ProcessChanges(rootPath, path, value, oldValue, skipDependents) {
        this.getterMap.delete(path);
        var newId = value && this.getIdCallback && this.getIdCallback(value);
        var oldId = oldValue && this.getIdCallback && this.getIdCallback(oldValue);
        if (oldId && oldId !== newId) {
            var oldIdPaths = this.idToPathsMap.get(oldId);
            oldIdPaths.delete(path);
            if (oldIdPaths.size === 0)
                this.idToPathsMap.delete(oldId);
        }
        if (!skipDependents && newId) {
            var dependentPaths = this.idToPathsMap.get(newId);
            if (!dependentPaths) {
                dependentPaths = new Set([path]);
                this.idToPathsMap.set(newId, dependentPaths);
            }
            else if (!dependentPaths.has(path))
                dependentPaths.add(path);
            dependentPaths.forEach(p => {
                if (p === path || p.indexOf(rootPath) === 0)
                    return;
                this.WriteTo(rootPath, p, value, true);
            });
        }
        var skipProperties = new Set();
        if (!IsValue(value)) {
            for (var key in value) {
                var childPath = [path, key].join(".");
                this.ProcessChanges(rootPath, childPath, value[key], oldValue && oldValue[key], skipDependents);
                skipProperties.add(key);
            }
        }
        this.CleanUp(oldValue, skipProperties, path);
        this.EmitSet(path);
    }
    CleanUp(value, skipProperties, path) {
        if (!IsValue(value)) {
            for (var key in value) {
                if (!(skipProperties && skipProperties.has(key))) {
                    var childPath = [path, key].join(".");
                    this.emitterMap.delete(childPath);
                    this.getterMap.delete(childPath);
                    this.CleanUp(value[key], null, childPath);
                }
            }
            if (!skipProperties || skipProperties.size === 0) {
                var id = this.getIdCallback && this.getIdCallback(value);
                if (id) {
                    var paths = this.idToPathsMap.get(id);
                    if (paths) {
                        paths.delete(path);
                        if (paths.size === 0)
                            this.idToPathsMap.delete(id);
                    }
                }
            }
        }
    }
    AssignPropertyPath(value, path) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
        parentObj[prop] = value;
    }
    ResolvePropertyPath(path) {
        if (!path)
            return this;
        return path.split(".").reduce((pre, curr) => {
            return pre && pre[curr];
        }, this);
    }
    CreateGetterObject(source, path) {
        if (IsValue(source))
            return source;
        var ret = null;
        if (Array.isArray(source)) {
            ret = new Array(source.length);
            for (var x = 0; x < source.length; x++)
                ret[x] = this.CreateGetterObject(source[x], [path, x].join("."));
        }
        else {
            ret = new Object();
            for (var key in source)
                this.CreateGetter(ret, path, key);
        }
        Object.defineProperty(ret, "___path", {
            value: path,
            configurable: false,
            enumerable: false,
            writable: false
        });
        this.getterMap.set(path, ret);
        return ret;
    }
    CreateGetter(target, parentPath, property) {
        var path = [parentPath, property].join('.');
        Object.defineProperty(target, property, {
            enumerable: true,
            get: () => {
                var val = this.ResolvePropertyPath(path);
                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                return ret || this.CreateGetterObject(val, path);
            },
        });
    }
    CreateCopy(source) {
        if (IsValue(source))
            return source;
        var ret = null;
        if (Array.isArray(source)) {
            ret = new Array(source.length);
            for (var x = 0; x < source.length; x++)
                ret[x] = this.CreateCopy(source[x]);
            return ret;
        }
        ret = {};
        for (var key in source)
            ret[key] = this.CreateCopy(source[key]);
        return ret;
    }
    EmitSet(path) {
        var emitter = this.emitterMap.get(path);
        if (!emitter) {
            emitter = new ObjectStoreEmitter(path);
            this.emitterMap.set(path, emitter);
        }
        emitter.emit("set");
    }
    EmitGet(path) {
        var emitter = this.emitterMap.get(path);
        if (!emitter) {
            emitter = new ObjectStoreEmitter(path);
            this.emitterMap.set(path, emitter);
        }
        globalEmitter.emit("get", emitter);
    }
}
exports.ObjectStore = ObjectStore;
(function (ObjectStore) {
    function Create(value, idCallback) {
        if (IsValue(value))
            throw "Only arrays and JSON types are supported";
        var store = new ObjectStore(idCallback);
        store.Root = value;
        return store;
    }
    ObjectStore.Create = Create;
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
    ObjectStore.Watch = Watch;
    function Value(val) {
        if (!IsValue(val))
            "Parameter is not a valid value type";
        return new LoneValue(val);
    }
    ObjectStore.Value = Value;
})(ObjectStore = exports.ObjectStore || (exports.ObjectStore = {}));
//# sourceMappingURL=objectStore.js.map