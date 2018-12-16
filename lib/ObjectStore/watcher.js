"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deferredPromise_1 = require("./deferredPromise");
class Watcher {
    constructor() {
        this.emitterStack = [];
        this.asyncQueue = [];
        this.processingAsync = false;
    }
    Watch(callback) {
        this.emitterStack.push(new Set());
        callback();
        return this.emitterStack.pop();
    }
    WatchAsync(callback) {
        var def = new deferredPromise_1.DeferredPromise(resolve => resolve());
        var prom = def.then(() => {
            this.emitterStack.push(new Set());
            return callback();
        }).then((value) => {
            return { emitters: this.emitterStack.pop(), value: value };
        });
        this.asyncQueue.push(def);
        this.ProcessAsyncQueue();
        return prom;
    }
    Register(emitter) {
        if (this.emitterStack.length === 0)
            return;
        var set = this.emitterStack[this.emitterStack.length - 1];
        if (!set.has(emitter))
            set.add(emitter);
    }
    ProcessAsyncQueue(recurse) {
        if (this.processingAsync && !recurse)
            return;
        this.processingAsync = true;
        if (this.asyncQueue.length === 0) {
            this.processingAsync = false;
            return;
        }
        var def = this.asyncQueue.shift();
        def.then(() => {
            this.ProcessAsyncQueue(true);
        });
        def.Invoke();
    }
}
exports.watcher = new Watcher();
//# sourceMappingURL=watcher.js.map