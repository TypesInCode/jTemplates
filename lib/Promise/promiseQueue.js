"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deferredPromise_1 = require("./deferredPromise");
class PromiseQueue {
    constructor() {
        this.running = false;
        this.queue = [];
    }
    get OnComplete() {
        if (!this.running)
            return Promise.resolve();
        if (!this.onComplete)
            this.onComplete = new deferredPromise_1.DeferredPromise(resolve => {
                resolve();
            });
        return this.onComplete;
    }
    Push(executor) {
        var p = new deferredPromise_1.DeferredPromise(executor);
        this.queue.push(p);
        this.Execute();
        return p;
    }
    Stop() {
        this.queue = [];
    }
    Execute() {
        if (this.running)
            return;
        this.running = true;
        this.ExecuteRecursive();
    }
    ExecuteRecursive(queueIndex) {
        queueIndex = queueIndex || 0;
        if (queueIndex >= this.queue.length) {
            this.running = false;
            this.queue = [];
            this.onComplete && this.onComplete.Invoke();
            this.onComplete = null;
            return;
        }
        this.queue[queueIndex].Invoke();
        this.queue[queueIndex].then(() => this.ExecuteRecursive(++queueIndex));
    }
}
exports.PromiseQueue = PromiseQueue;
