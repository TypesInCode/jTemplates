"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workerQueue_1 = require("./workerQueue");
const storeWorker_1 = require("./storeWorker");
class DiffAsync {
    constructor() {
        this.workerQueue = new workerQueue_1.WorkerQueue(storeWorker_1.StoreWorker.Create());
        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
    }
    Diff(path, newValue, resolveOldValue) {
        return this.workerQueue.Push(() => ({
            method: "diff",
            arguments: [path, newValue, resolveOldValue()]
        }));
    }
}
exports.DiffAsync = DiffAsync;
//# sourceMappingURL=diffAsync.js.map