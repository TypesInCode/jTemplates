"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deferredPromise_1 = require("../deferredPromise");
class WorkerQueue {
    constructor(worker) {
        this.promiseQueue = [];
        this.deferred = null;
        this.queueIndex = 0;
        this.running = false;
        this.worker = null;
        this.worker = worker;
    }
    get Running() {
        return this.running;
    }
    OnComplete() {
        if (!this.running)
            return Promise.resolve();
        this.deferred = new deferredPromise_1.DeferredPromise(resolve => resolve());
        return this.deferred;
    }
    Push(getMessage) {
        var p = new deferredPromise_1.DeferredPromise((resolve, reject) => {
            this.worker.onmessage = (message) => {
                resolve(message.data);
            };
            this.worker.onerror = (event) => {
                console.log("Error in worker");
                console.log(event);
                reject();
            };
            this.worker.postMessage(getMessage());
        });
        this.promiseQueue.push(p);
        return p;
    }
    Process() {
        if (this.running)
            return;
        this.running = true;
        this.ProcessQueueRecursive();
    }
    ProcessQueueRecursive() {
        if (this.queueIndex >= this.promiseQueue.length) {
            this.running = false;
            this.queueIndex = 0;
            this.promiseQueue = [];
            this.deferred && this.deferred.Invoke();
            this.deferred = null;
            return;
        }
        this.promiseQueue[this.queueIndex].Invoke();
        this.promiseQueue[this.queueIndex].then(() => {
            this.queueIndex++;
            this.ProcessQueueRecursive();
        });
    }
}
exports.WorkerQueue = WorkerQueue;
//# sourceMappingURL=workerQueue.js.map