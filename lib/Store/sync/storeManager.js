"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../emitter");
const objectDiff_1 = require("../objectDiff");
class StoreManager {
    constructor(idFunction) {
        this.emitterMap = new Map();
        this.diff = objectDiff_1.ObjectDiff();
        this.diff({
            method: "create",
            arguments: [idFunction]
        });
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
        var emitter = this.emitterMap.get(path);
        if (emitter) {
            this.emitterMap.delete(path);
            emitter.emit("destroy", emitter);
        }
    }
    Destroy() {
        this.root = null;
        this.emitterMap.forEach(value => value.removeAllListeners());
        this.emitterMap.clear();
    }
}
exports.StoreManager = StoreManager;
//# sourceMappingURL=storeManager.js.map