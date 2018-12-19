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
const utils_1 = require("../utils");
const storeAsyncQuery_1 = require("./storeAsyncQuery");
class StoreAsyncWriter {
    constructor(store) {
        this.store = store;
    }
    set Root(val) {
        this.WriteTo("root", val);
    }
    Write(readOnly, updateCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = null;
            if (typeof readOnly === 'string')
                path = yield this.store.GetPathById(readOnly);
            var path = path || readOnly && readOnly.___path;
            if (!path)
                return;
            yield this.WriteTo(path, updateCallback);
        });
    }
    Push(readOnly, newValue) {
        return __awaiter(this, void 0, void 0, function* () {
            var path = readOnly.___path;
            var localValue = this.store.ResolvePropertyPath(path);
            var childPath = [path, localValue.length].join(".");
            localValue.push(null);
            yield this.WriteTo(childPath, newValue);
            this.EmitSet(path);
        });
    }
    Query(defaultValue, callback) {
        return new storeAsyncQuery_1.StoreAsyncQuery(this.store, callback, defaultValue);
    }
    WriteTo(path, updateCallback, skipDependents) {
        return __awaiter(this, void 0, void 0, function* () {
            var value = this.ResolveUpdateCallback(path, updateCallback);
            var diff = yield this.store.Diff(path, value, !!skipDependents);
            this.store.AssignPropertyPath(value, path);
            this.ProcessDiff(diff);
        });
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
exports.StoreAsyncWriter = StoreAsyncWriter;
//# sourceMappingURL=storeAsyncWriter.js.map