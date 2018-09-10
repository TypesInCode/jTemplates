"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proxyObservable_1 = require("./proxyObservable");
const emitter_1 = require("../emitter");
class ProxyObservableScope extends emitter_1.Emitter {
    constructor(valueFunction) {
        super();
        this.valueFunction = valueFunction;
        this.trackedEmitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    get Value() {
        if (!this.dirty)
            return this.value;
        this.UpdateValue();
        return this.value;
    }
    get Dirty() {
        return this.dirty;
    }
    Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }
    UpdateValue() {
        var newEmitters = proxyObservable_1.ProxyObservable.Watch(() => {
            this.value = this.valueFunction();
        });
        var newSet = new Set([...newEmitters]);
        this.trackedEmitters.forEach(emitter => {
            if (!newSet.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });
        newSet.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newSet;
        this.dirty = false;
    }
    SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}
exports.ProxyObservableScope = ProxyObservableScope;
//# sourceMappingURL=proxyObservableScope.js.map