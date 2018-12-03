"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
const objectStoreScope_1 = require("./objectStoreScope");
function IsValue(value) {
    if (!value)
        return true;
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
}
class Store {
    constructor(idCallback) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new emitter_1.default());
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
    Scope(valueFunction) {
        return new objectStoreScope_1.Scope(() => valueFunction(this.Root));
    }
    Get(id) {
        var paths = this.idToPathsMap.get(id);
        if (!paths)
            return null;
        var path = paths.values().next().value;
        this.EmitGet(path);
        var ret = this.getterMap.get(path);
        return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
    }
    Write(readOnly, updateCallback) {
        if (typeof readOnly === 'string') {
            readOnly = this.Get(readOnly);
            if (!readOnly)
                return;
        }
        var path = readOnly ? readOnly.___path : "root";
        var localValue = this.ResolvePropertyPath(path);
        var newValue = null;
        var mutableCopy = null;
        if (typeof updateCallback === 'function') {
            mutableCopy = this.CreateCopy(localValue);
            newValue = updateCallback(mutableCopy);
        }
        else
            newValue = updateCallback;
        this.WriteTo(path, typeof newValue !== "undefined" ? newValue : mutableCopy);
    }
    Push(readOnly, newValue) {
        var path = readOnly.___path;
        var localValue = this.ResolvePropertyPath(path);
        var oldLength = localValue.length;
        var childPath = [path, oldLength].join(".");
        localValue.push(null);
        this.WriteTo(childPath, newValue);
        var getterValue = this.getterMap.get(path);
        getterValue.push(this.CreateGetterObject(newValue, childPath));
        this.EmitSet(path);
    }
    WriteTo(path, value, skipDependents) {
        var localValue = this.ResolvePropertyPath(path);
        if (localValue === value)
            return;
        this.AssignPropertyPath(value, path);
        this.ProcessChanges(path, path, value, localValue, skipDependents);
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
                this.WriteTo(p, value, true);
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
            ret = Object.create(null);
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
                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
            },
            set: (val) => {
                this.WriteTo(path, val);
            }
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
            emitter = new emitter_1.default();
            this.emitterMap.set(path, emitter);
        }
        emitter.emit("set");
    }
    EmitGet(path) {
        var emitter = this.emitterMap.get(path);
        if (!emitter) {
            emitter = new emitter_1.default();
            this.emitterMap.set(path, emitter);
        }
        globalEmitter_1.globalEmitter.Register(emitter);
    }
}
exports.Store = Store;
(function (Store) {
    function Create(value, idCallback) {
        if (IsValue(value))
            throw "Only arrays and JSON types are supported";
        var store = new Store(idCallback);
        store.Root = value;
        return store;
    }
    Store.Create = Create;
})(Store = exports.Store || (exports.Store = {}));
//# sourceMappingURL=objectStore.js.map