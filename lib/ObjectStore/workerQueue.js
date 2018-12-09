"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WorkerQueue {
    constructor(workerFactory) {
        this.workerFactory = workerFactory;
        this.queue = [];
        this.queueIndex = 0;
        this.running = false;
    }
    Push(getMessage, completeCallback) {
        this.queue.push((next) => {
            var worker = this.workerFactory();
            worker.onmessage = (message) => {
                worker.terminate();
                completeCallback(message);
                next();
            };
            worker.onerror = (err) => {
                console.error(err);
                next();
            };
            worker.postMessage(getMessage());
        });
        this.ProcessQueue();
    }
    ProcessQueue() {
        if (this.running)
            return;
        this.queueIndex = 0;
        this.running = true;
        this.ProcessQueueRecursive();
    }
    ProcessQueueRecursive() {
        if (this.queueIndex >= this.queue.length) {
            this.queue = [];
            this.running = false;
            this.queueIndex = 0;
            return;
        }
        this.queue[this.queueIndex](() => {
            this.queueIndex++;
            this.ProcessQueueRecursive();
        });
    }
}
exports.WorkerQueue = WorkerQueue;
//# sourceMappingURL=workerQueue.js.map