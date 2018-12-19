"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../emitter");
const objectDiff_1 = require("../objectDiff");
const storeReader_1 = require("./storeReader");
const storeWriter_1 = require("./storeWriter");
class Store {
    constructor(idFunction) {
        this.emitterMap = new Map();
        this.diff = objectDiff_1.ObjectDiff();
        this.diff({
            method: "create",
            arguments: [idFunction]
        });
        this.arrayCacheMap = new Map();
    }
    GetReader() {
        return new storeReader_1.StoreReader(this);
    }
    GetWriter() {
        return new storeWriter_1.StoreWriter(this);
    }
    Diff(path, newValue, skipDependents) {
        var oldValue = this.ResolvePropertyPath(path);
        return this.diff({
            method: "diff",
            arguments: [path, newValue, oldValue, skipDependents]
        });
    }
    GetPathById(id) {
        var path = this.diff({
            method: "getpath",
            arguments: [id]
        });
        if (!path)
            return;
        return path;
    }
    EnsureEmitter(path) {
        var emitter = this.emitterMap.get(path);
        if (!emitter) {
            emitter = new emitter_1.Emitter();
            this.emitterMap.set(path, emitter);
        }
        return emitter;
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
    DeleteEmitter(path) {
        this.emitterMap.delete(path);
    }
    GetCachedArray(path) {
        return this.arrayCacheMap.get(path);
    }
    SetCachedArray(path, array) {
        this.arrayCacheMap.set(path, array);
    }
}
exports.Store = Store;
(function (Store) {
    function Create(init, idFunction) {
        var store = new Store(idFunction);
        var writer = store.GetWriter();
        writer.Root = init;
        return writer;
    }
    Store.Create = Create;
})(Store = exports.Store || (exports.Store = {}));
//# sourceMappingURL=store.js.map