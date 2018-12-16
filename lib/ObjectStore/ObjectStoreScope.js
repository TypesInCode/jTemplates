"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const watcherAsync_1 = require("./watcherAsync");
const watcher_1 = require("./watcher");
class Scope extends emitter_1.Emitter {
    constructor(getFunction, defaultValue) {
        super();
        this.getFunction = getFunction;
        this.trackedEmitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.defaultValue = defaultValue;
        this.isSync = false;
        this.UpdateValue();
    }
    get Value() {
        watcherAsync_1.watcherAsync.Register(this);
        watcher_1.watcher.Register(this);
        if (this.dirty)
            this.UpdateValue();
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }
    Scope(getFunction, defaultValue) {
        return new Scope(() => getFunction(this.Value), defaultValue);
    }
    Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }
    UpdateScope(newEmitters, value) {
        this.trackedEmitters.forEach(emitter => {
            if (!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });
        newEmitters.delete(this);
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
        this.value = value;
    }
    UpdateValue() {
        this.dirty = false;
        if (!this.isSync) {
            watcherAsync_1.watcherAsync.Get()
                .then(scope => scope.Watch(() => {
                var val = this.getFunction();
                var promise = Promise.resolve(val);
                this.isSync = promise !== val;
                return promise;
            })).then(resp => {
                this.UpdateScope(resp[0], resp[1]);
                this.emit("set");
            });
        }
        else {
            var syncValue = null;
            var syncEmitters = watcher_1.watcher.Watch(() => {
                syncValue = this.getFunction();
            });
            this.UpdateScope(syncEmitters, syncValue);
        }
    }
    SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}
exports.Scope = Scope;
//# sourceMappingURL=objectStoreScope.js.map