"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workerQueue_1 = require("./workerQueue");
const storeWorker_1 = require("./storeWorker");
class DiffAsync {
    constructor() {
        this.workerQueue = new workerQueue_1.WorkerQueue(storeWorker_1.StoreWorker.Create());
        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
    }
    DiffBatch(batch) {
        return this.workerQueue.Push(() => ({
            method: "diffbatch",
            arguments: [batch]
        }));
    }
    Destroy() {
        this.workerQueue.Destroy();
    }
}
exports.DiffAsync = DiffAsync;
//# sourceMappingURL=diffAsync.js.map