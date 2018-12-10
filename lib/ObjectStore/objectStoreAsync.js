"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
const objectStoreScope_1 = require("./objectStoreScope");
const objectStoreWorker_1 = require("./objectStoreWorker");
const workerQueue_1 = require("./workerQueue");
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
        this.workerQueue = new workerQueue_1.WorkerQueue(objectStoreWorker_1.ObjectStoreWorker.Create);
    }
    get Root() {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }
    set Root(val) {
        this.WriteToSync("root", val);
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
        var path = readOnly ? readOnly.___path : "root";
        return this.WriteToAsync(path, () => {
            if (typeof updateCallback === 'function') {
                var localValue = this.ResolvePropertyPath(path);
                var mutableCopy = this.CreateCopy(localValue);
                var ret = updateCallback(mutableCopy);
                return typeof ret === 'undefined' ? mutableCopy : ret;
            }
            return updateCallback;
        });
    }
    Push(readOnly, newValue) {
        var path = readOnly.___path;
        var localValue = this.ResolvePropertyPath(path);
        var childPath = [path, localValue.length].join(".");
        localValue.push(null);
        var getterValue = this.getterMap.get(path);
        getterValue.push(this.CreateGetterObject(newValue, childPath));
        this.WriteToSync(childPath, newValue);
        this.EmitSet(path);
    }
    WriteToSync(path, value) {
        var localValue = this.ResolvePropertyPath(path);
        if (localValue === value)
            return;
        this.AssignPropertyPath(value, path);
        var resp = {
            wasNull: !localValue && localValue !== 0,
            skipDependents: false,
            changedPaths: null,
            deletedPaths: [],
            processedIds: [],
            rootPath: path
        };
        resp.changedPaths = this.ProcessChanges(path, value, localValue, this.getIdCallback, resp);
        this.CleanMaps(resp);
    }
    WriteToAsync(path, valueCallback, skipDependents) {
        return new Promise((resolve, reject) => {
            var value = null;
            this.workerQueue.Push(() => {
                value = valueCallback();
                return {
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(path),
                    path: path,
                    idFunction: this.getIdCallback && this.getIdCallback.toString(),
                    skipDependents: !!skipDependents
                };
            }, (postMessage) => {
                this.AssignPropertyPath(value, path);
                this.CleanMaps(postMessage.data);
                resolve();
            });
        });
    }
    ProcessChanges(path, value, oldValue, idFunction, response) {
        var localIdFunction = null;
        if (typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if (idFunction)
            localIdFunction = idFunction;
        var newIsValue = IsValue(value);
        var oldIsValue = IsValue(oldValue);
        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if (oldId || newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }
        var skipProperties = new Set();
        var pathChanged = false;
        var childChanges = null;
        if (newIsValue)
            pathChanged = value !== oldValue;
        else {
            pathChanged = oldIsValue;
            if (!pathChanged) {
                for (var key in value) {
                    pathChanged = pathChanged || !(key in oldValue);
                    var childPath = [path, key].join(".");
                    childChanges = this.ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
                    skipProperties.add(key);
                }
            }
        }
        var deletedCount = response.deletedPaths.length;
        this.DeleteProperties(oldValue, skipProperties, path, response, localIdFunction);
        pathChanged = pathChanged || deletedCount !== response.deletedPaths.length;
        if (pathChanged && childChanges)
            return [path].concat(childChanges);
        else if (pathChanged)
            return [path];
        else if (childChanges)
            return childChanges;
        return [];
    }
    DeleteProperties(value, skipProperties, path, response, idFunction) {
        if (IsValue(value))
            return;
        for (var key in value) {
            if (!skipProperties || !skipProperties.has(key)) {
                var childPath = [path, key].join(".");
                response.deletedPaths.push(childPath);
                this.DeleteProperties(value[key], null, childPath, response, idFunction);
            }
        }
        if (!skipProperties) {
            var id = idFunction && idFunction(value);
            if (id) {
                response.processedIds.push({
                    newId: null,
                    oldId: id,
                    path: path
                });
            }
        }
    }
    CleanMaps(data) {
        if (!data.wasNull)
            data.changedPaths.forEach(p => {
                this.getterMap.delete(p);
                this.EmitSet(p);
            });
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
                if (oldIdPaths) {
                    oldIdPaths.delete(idObj.path);
                    if (oldIdPaths.size === 0)
                        this.idToPathsMap.delete(idObj.oldId);
                }
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
                    this.WriteToAsync(p, value, true);
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
                this.WriteToAsync(path, () => val);
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