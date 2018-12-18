"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const storeQuery_1 = require("./storeQuery");
class StoreWriter {
    constructor(store) {
        this.store = store;
    }
    set Root(val) {
        this.WriteTo("root", val);
    }
    Write(readOnly, updateCallback) {
        var path = null;
        if (typeof readOnly === 'string')
            path = this.store.GetPathById(readOnly);
        var path = path || readOnly && readOnly.___path;
        if (!path)
            return;
        this.WriteTo(path, updateCallback);
    }
    Query(callback) {
        return new storeQuery_1.StoreQuery(this.store, callback);
    }
    WriteTo(path, updateCallback, skipDependents) {
        var value = this.ResolveUpdateCallback(path, updateCallback);
        var diff = this.store.Diff(path, value, !!skipDependents);
        this.store.AssignPropertyPath(value, path);
        this.ProcessDiff(diff);
    }
    ResolveUpdateCallback(path, updateCallback) {
        if (typeof updateCallback === 'function') {
            var localValue = this.store.ResolvePropertyPath(path);
            var mutableCopy = this.CreateCopy(localValue);
            var ret = updateCallback(mutableCopy);
            return typeof ret === 'undefined' ? mutableCopy : ret;
        }
        return updateCallback;
    }
    CreateCopy(source) {
        if (utils_1.IsValue(source))
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
    ProcessDiff(data) {
        data.changedPaths.forEach(p => {
            this.EmitSet(p);
        });
        data.deletedPaths.forEach(p => {
            this.store.DeleteEmitter(p);
        });
        data.pathDependencies.forEach(dep => {
            var value = this.store.ResolvePropertyPath(dep.path);
            dep.targets.forEach(target => {
                this.WriteTo(target, value, true);
            });
        });
    }
    EmitSet(path) {
        var emitter = this.store.EnsureEmitter(path);
        emitter.emit("set");
    }
}
exports.StoreWriter = StoreWriter;
//# sourceMappingURL=storeWriter.js.map