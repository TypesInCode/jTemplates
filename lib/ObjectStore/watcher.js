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
        var prom = def.then(() => __awaiter(this, void 0, void 0, function* () {
            this.emitterStack.push(new Set());
            yield callback();
            return this.emitterStack.pop();
        }));
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
    ProcessAsyncQueue() {
        if (this.processingAsync)
            return;
        this.processingAsync = true;
        if (this.asyncQueue.length === 0) {
            this.processingAsync = false;
            return;
        }
        var def = this.asyncQueue.shift();
        def.then(() => this.ProcessAsyncQueue());
        def.Invoke();
    }
}
exports.watcher = new Watcher();
//# sourceMappingURL=watcher.js.map