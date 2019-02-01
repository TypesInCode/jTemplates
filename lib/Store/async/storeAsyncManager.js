"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../emitter");
const workerQueue_1 = require("./workerQueue");
const storeWorker_1 = require("./storeWorker");
class StoreAsyncManager {
    constructor(idFunction) {
        this.emitterMap = new Map();
        this.worker = storeWorker_1.StoreWorker.Create();
        this.workerQueue = new workerQueue_1.WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()] }));
    }
    Diff(path, newValue, skipDependents) {
        return this.workerQueue.Push(() => {
            var oldValue = this.ResolvePropertyPath(path);
            return {
                method: "diff",
                arguments: [path, newValue, oldValue, skipDependents]
            };
        });
    }
    GetPathById(id) {
        return this.workerQueue.Push(() => ({
            method: "getpath",
            arguments: [id]
        }));
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
        this.workerQueue.Stop();
    }
}
exports.StoreAsyncManager = StoreAsyncManager;
//# sourceMappingURL=storeAsyncManager.js.map