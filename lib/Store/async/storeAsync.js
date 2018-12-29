"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../emitter");
const storeAsyncReader_1 = require("./storeAsyncReader");
const storeAsyncWriter_1 = require("./storeAsyncWriter");
const workerQueue_1 = require("./workerQueue");
const storeWorker_1 = require("./storeWorker");
const deferredPromise_1 = require("../deferredPromise");
const storeAsyncQuery_1 = require("./storeAsyncQuery");
class StoreAsync {
    constructor(idFunction) {
        this.emitterMap = new Map();
        this.worker = storeWorker_1.StoreWorker.Create();
        this.workerQueue = new workerQueue_1.WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()] }));
        this.queryQueue = [];
        this.queryCache = new Map();
    }
    GetQuery(id, defaultValue, callback) {
        var query = this.queryCache.get(id);
        if (!query) {
            query = new storeAsyncQuery_1.StoreAsyncQuery(this, callback, defaultValue);
            this.queryCache.set(id, query);
        }
        return query;
    }
    GetReader() {
        return new storeAsyncReader_1.StoreAsyncReader(this);
    }
    GetWriter() {
        return new storeAsyncWriter_1.StoreAsyncWriter(this);
    }
    ProcessStoreQueue() {
        this.workerQueue.Process();
    }
    QueryStart() {
        this.queryQueue.push(new deferredPromise_1.DeferredPromise(resolve => resolve()));
        if (this.queryQueue.length === 1)
            this.queryQueue[0].Invoke();
        return this.queryQueue[this.queryQueue.length - 1];
    }
    QueryEnd() {
        this.queryQueue.shift();
        if (this.queryQueue.length > 0)
            this.queryQueue[0].Invoke();
    }
    Diff(path, newValue, skipDependents) {
        return new Promise(resolve => {
            var oldValue = this.ResolvePropertyPath(path);
            var promise = this.workerQueue.Push(() => ({
                method: "diff",
                arguments: [path, newValue, oldValue, skipDependents]
            }));
            resolve(promise);
            this.ProcessStoreQueue();
        });
    }
    GetPathById(id) {
        return new Promise(resolve => {
            var promise = this.workerQueue.Push(() => ({
                method: "getpath",
                arguments: [id]
            }));
            resolve(promise);
            this.ProcessStoreQueue();
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
    EnsureEmitter(path) {
        var emitter = this.emitterMap.get(path);
        if (!emitter) {
            emitter = new emitter_1.Emitter();
            this.emitterMap.set(path, emitter);
        }
        return emitter;
    }
    DeleteEmitter(path) {
        this.emitterMap.delete(path);
    }
    Destroy() {
        this.worker.terminate();
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.emitterMap.forEach(e => e.removeAllListeners());
        this.emitterMap.clear();
    }
}
exports.StoreAsync = StoreAsync;
(function (StoreAsync) {
    function Create(init, idFunction) {
        var store = new StoreAsync(idFunction);
        var writer = store.GetWriter();
        writer.Root = init;
        return writer;
    }
    StoreAsync.Create = Create;
})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));
//# sourceMappingURL=storeAsync.js.map