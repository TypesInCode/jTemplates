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
        var def = new deferredPromise_1.DeferredPromise(resolve => {
            this.emitterStack.push(new Set());
            callback().then((value) => {
                var emitters = this.emitterStack.pop();
                resolve({ value: value, emitters: emitters });
            });
        });
        this.asyncQueue.push(def);
        return def;
    }
    Register(emitter) {
        if (this.emitterStack.length === 0)
            return;
        var set = this.emitterStack[this.emitterStack.length - 1];
        if (!set.has(emitter))
            set.add(emitter);
    }
    GoAsync() {
        this.ProcessAsyncQueue();
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