"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const scopeCollector_1 = require("./scopeCollector");
class ScopeBase extends emitter_1.default {
    constructor(getFunction, defaultValue) {
        super();
        this.getFunction = getFunction;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.defaultValue = defaultValue;
        this.dirty = true;
    }
    get Value() {
        scopeCollector_1.scopeCollector.Register(this);
        if (this.dirty)
            this.UpdateValueBase();
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }
    Destroy() {
        this.removeAllListeners();
        this.emitters.forEach(e => e.removeListener("set", this.setCallback));
        this.emitters.clear();
    }
    GetNewValue(...args) {
        return this.getFunction(...args);
    }
    UpdateValueBase() {
        this.dirty = false;
        var async = false;
        this.UpdateValue((emitters, value) => {
            this.UpdateEmitters(emitters);
            this.value = value;
            if (async)
                this.emit("set");
        });
        async = true;
    }
    UpdateEmitters(newEmitters) {
        this.emitters.forEach(emitter => {
            if (!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });
        while (newEmitters.has(this))
            newEmitters.delete(this);
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.emitters = newEmitters;
    }
    SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}
exports.ScopeBase = ScopeBase;
//# sourceMappingURL=scopeBase.js.map