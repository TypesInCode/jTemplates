"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        this.worker = objectStoreWorker_1.ObjectStoreWorker.Create();
        this.workerQueue = new workerQueue_1.WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [this.getIdCallback && this.getIdCallback.toString()] }));
    }
    get Root() {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }
    set Root(val) {
        this.WriteToAsync("root", val);
    }
    Scope(valueFunction, defaultValue) {
        return new objectStoreScope_1.Scope(() => valueFunction(this.Root), defaultValue);
    }
    Get(id) {
        return new Promise((resolve, reject) => {
            this.workerQueue.Push(() => ({
                method: "getpath",
                arguments: [id]
            })).then(path => {
                if (!path) {
                    resolve();
                    return;
                }
                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                resolve(ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path));
            }).catch(reject);
            this.workerQueue.Process();
        });
    }
    WriteComplete() {
        return this.workerQueue.OnComplete();
    }
    Write(readOnly, updateCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof readOnly === 'string')
                readOnly = yield this.Get(readOnly);
            var path = readOnly && readOnly.___path;
            if (!path)
                return;
            return this.WriteToAsync(path, updateCallback);
        });
    }
    Push(readOnly, newValue) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = readOnly.___path;
            var localValue = this.ResolvePropertyPath(path);
            var childPath = [path, localValue.length].join(".");
            localValue.push(null);
            var getterValue = this.getterMap.get(path);
            getterValue.push(this.CreateGetterObject(newValue, childPath));
            yield this.WriteToAsync(childPath, newValue);
            this.EmitSet(path);
        });
    }
    WriteToAsync(path, updateCallback, skipDependents) {
        return new Promise(resolve => {
            var value = null;
            var promise = this.workerQueue.Push(() => {
                value = this.ResolveUpdateCallback(path, updateCallback);
                return {
                    method: "diff",
                    arguments: [path, value, this.ResolvePropertyPath(path), skipDependents]
                };
            }).then((resp) => {
                this.AssignPropertyPath(value, path);
                this.ProcessDiff(resp);
            });
            resolve(promise);
            this.workerQueue.Process();
        });
    }
    ResolveUpdateCallback(path, updateCallback) {
        if (typeof updateCallback === 'function') {
            var localValue = this.ResolvePropertyPath(path);
            var mutableCopy = this.CreateCopy(localValue);
            var ret = updateCallback(mutableCopy);
            return typeof ret === 'undefined' ? mutableCopy : ret;
        }
        return updateCallback;
    }
    ProcessDiff(data) {
        data.changedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.EmitSet(p);
        });
        data.deletedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.emitterMap.delete(p);
        });
        data.pathDependencies.forEach(dep => {
            var value = this.ResolvePropertyPath(dep.path);
            dep.targets.forEach(target => {
                this.WriteToAsync(target, value, true);
            });
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
                this.WriteToAsync(path, val);
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
        return __awaiter(this, void 0, void 0, function* () {
            if (IsValue(value))
                throw "Only arrays and JSON types are supported";
            var store = new StoreAsync(idCallback);
            store.Root = value;
            yield store.WriteComplete();
            return store;
        });
    }
    StoreAsync.Create = Create;
})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));
//# sourceMappingURL=objectStoreAsync.js.map