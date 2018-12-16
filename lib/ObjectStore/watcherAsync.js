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
class ScopeAsync {
    constructor(watcher, parent) {
        this.watcher = watcher;
        this.parent = parent;
        this.emitters = new Set();
    }
    Watch(promiseCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.watcher.Scope = this;
            yield promiseCallback();
            this.watcher.Scope = null;
            this.watcher.Next();
            return this.emitters;
        });
    }
    Add(emitter) {
        if (emitter === this.parent) {
            console.log("skipping parent");
            return;
        }
        this.emitters.add(emitter);
    }
}
class WatcherAsync {
    constructor() {
        this.deferredQueue = [];
    }
    set Scope(val) {
        this.activeScope = val;
    }
    Get(parent) {
        var deferred = new deferredPromise_1.DeferredPromise((resolve) => resolve(new ScopeAsync(this, parent)));
        this.deferredQueue.push(deferred);
        if (this.deferredQueue.length === 1)
            this.deferredQueue[0].Invoke();
        return deferred;
    }
    Next() {
        this.deferredQueue.shift();
        if (this.deferredQueue.length > 0)
            this.deferredQueue[0].Invoke();
    }
    Register(emitter) {
        if (this.activeScope)
            this.activeScope.Add(emitter);
    }
}
exports.watcherAsync = new WatcherAsync();
//# sourceMappingURL=watcherAsync.js.map