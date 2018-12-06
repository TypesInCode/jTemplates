"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
const objectStoreScope_1 = require("./objectStoreScope");
const objectStoreWorker_1 = require("./objectStoreWorker");
function IsValue(value) {
    if (!value)
        return true;
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
}
class StoreAsync {
    constructor(idCallback) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new emitter_1.default());
        this.getterMap = new Map();
        this.idToPathsMap = new Map();
        this.worker = objectStoreWorker_1.ObjectStoreWorker.Create();
        this.worker.onmessage = (event) => {
            var data = event.data;
            this.CleanMaps(data);
        };
    }
    get Root() {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }
    set Root(val) {
        this.Write(null, () => val);
    }
    Scope(valueFunction, setFunction) {
        return new objectStoreScope_1.Scope(() => valueFunction(this.Root), (next) => setFunction(this.Root, next));
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
        this.AssignPropertyPath(newValue, childPath);
        var getterValue = this.getterMap.get(path);
        getterValue.push(this.CreateGetterObject(newValue, childPath));
        var resp = {
            wasNull: true,
            skipDependents: false,
            changedPaths: [],
            deletedPaths: [],
            processedIds: [],
            rootPath: path
        };
        this.ProcessChanges(childPath, newValue, null, this.getIdCallback, resp);
        this.CleanMaps(resp);
        this.EmitSet(path);
    }
    WriteTo(path, value, skipDependents) {
        var localValue = this.ResolvePropertyPath(path);
        if (localValue === value)
            return;
        this.AssignPropertyPath(value, path);
        this.worker.postMessage({
            newValue: value,
            oldValue: localValue,
            path: path,
            idFunction: this.getIdCallback && this.getIdCallback.toString(),
            skipDependents: !!skipDependents
        });
    }
    ProcessChanges(path, value, oldValue, idFunction, response) {
        var localIdFunction = null;
        if (typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if (idFunction)
            localIdFunction = idFunction;
        response.changedPaths.push(path);
        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if (oldId && oldId !== newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }
        var skipProperties = new Set();
        if (!IsValue(value)) {
            for (var key in value) {
                var childPath = [path, key].join(".");
                this.ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
                skipProperties.add(key);
            }
        }
        this.DeleteProperties(oldValue, skipProperties, path, response);
    }
    DeleteProperties(value, skipProperties, path, response) {
        if (!IsValue(value)) {
            for (var key in value) {
                if (!(skipProperties && skipProperties.has(key))) {
                    var childPath = [path, key].join(".");
                    response.deletedPaths.push(childPath);
                    this.DeleteProperties(value[key], null, childPath, response);
                }
            }
            if (!skipProperties || skipProperties.size === 0) {
                var id = this.getIdCallback && this.getIdCallback(value);
                if (id) {
                    response.processedIds.push({
                        newId: null,
                        oldId: id,
                        path: path
                    });
                }
            }
        }
    }
    CleanMaps(data) {
        if (!data.wasNull) {
            data.changedPaths.forEach(p => this.getterMap.delete(p));
            data.changedPaths.forEach(p => this.EmitSet(p));
        }
        data.deletedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.emitterMap.delete(p);
        });
        data.processedIds.forEach(idObj => {
            var oldId = idObj.oldId;
            var newId = idObj.newId;
            var path = idObj.path;
            if (oldId && oldId !== newId) {
                var oldIdPaths = this.idToPathsMap.get(oldId);
                oldIdPaths.delete(idObj.path);
                if (oldIdPaths.size === 0)
                    this.idToPathsMap.delete(idObj.oldId);
            }
            if (!data.skipDependents && newId) {
                var value = this.ResolvePropertyPath(idObj.path);
                var dependentPaths = this.idToPathsMap.get(newId);
                if (!dependentPaths) {
                    dependentPaths = new Set([path]);
                    this.idToPathsMap.set(newId, dependentPaths);
                }
                else if (!dependentPaths.has(path))
                    dependentPaths.add(path);
                dependentPaths.forEach(p => {
                    if (p === path || p.indexOf(data.rootPath) === 0)
                        return;
                    this.WriteTo(p, value, true);
                });
            }
        });
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
exports.StoreAsync = StoreAsync;
(function (StoreAsync) {
    function Create(value, idCallback) {
        if (IsValue(value))
            throw "Only arrays and JSON types are supported";
        var store = new StoreAsync(idCallback);
        store.Root = value;
        return store;
    }
    StoreAsync.Create = Create;
})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));
//# sourceMappingURL=objectStoreAsync.js.map