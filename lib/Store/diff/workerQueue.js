"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promiseQueue_1 = require("../../Promise/promiseQueue");
class WorkerQueue {
    constructor(worker) {
        this.worker = worker;
        this.promiseQueue = new promiseQueue_1.PromiseQueue();
    }
    Push(getMessage) {
        return this.promiseQueue.Push((resolve, reject) => {
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
    }
    Stop() {
        this.promiseQueue.Stop();
    }
    Destroy() {
        this.worker.terminate();
    }
}
exports.WorkerQueue = WorkerQueue;
