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
const emitter_1 = require("../../emitter");
const storeAsyncReader_1 = require("./storeAsyncReader");
const storeAsyncWriter_1 = require("./storeAsyncWriter");
const workerQueue_1 = require("./workerQueue");
const storeWorker_1 = require("./storeWorker");
class StoreAsync {
    constructor(idFunction) {
        this.emitterMap = new Map();
        this.worker = storeWorker_1.StoreWorker.Create();
        this.workerQueue = new workerQueue_1.WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()] }));
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
    OnStoreQueueComplete() {
        return this.workerQueue.OnComplete();
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
}
exports.StoreAsync = StoreAsync;
(function (StoreAsync) {
    function Create(init, idFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            var store = new StoreAsync(idFunction);
            var writer = store.GetWriter();
            writer.Root = init;
            yield writer.OnWriteComplete();
            return writer;
        });
    }
    StoreAsync.Create = Create;
})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));
//# sourceMappingURL=storeAsync.js.map