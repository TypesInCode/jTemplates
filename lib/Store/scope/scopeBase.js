"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../Utils/emitter");
const scopeCollector_1 = require("./scopeCollector");
class ScopeBase extends emitter_1.default {
    constructor(defaultValue = null) {
        super();
        this.defaultValue = defaultValue;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.destroyCallback = this.DestroyCallback.bind(this);
        this.dirty = true;
        this.isAsync = false;
    }
    get Value() {
        scopeCollector_1.scopeCollector.Register(this);
        if (this.dirty)
            this.UpdateValueBase();
        return !this.HasValue ? this.defaultValue : this.value;
    }
    get HasValue() {
        return typeof this.value !== 'undefined';
    }
    Destroy() {
        this.emitters.forEach(e => {
            e.removeListener("set", this.setCallback);
            e.removeListener("destroy", this.destroyCallback);
        });
        this.emitters.clear();
        this.emit("destroy", this);
        this.removeAllListeners();
    }
    UpdateValueBase() {
        this.dirty = false;
        var callbackFired = false;
        this.UpdateValue((emitters, value) => {
            callbackFired = true;
            this.UpdateEmitters(emitters);
            this.value = value;
            if (this.isAsync)
                this.emit("set");
        });
        this.isAsync = !callbackFired;
    }
    UpdateEmitters(newEmitters) {
        this.emitters.forEach(e => {
            if (!newEmitters.has(e)) {
                this.RemoveListenersFrom(e);
            }
        });
        newEmitters.forEach(e => {
            this.AddListenersTo(e);
        });
        this.emitters = newEmitters;
    }
    SetCallback() {
        if (!this.isAsync) {
            this.dirty = true;
            this.emit("set");
        }
        else
            this.UpdateValueBase();
    }
    DestroyCallback(emitter) {
        this.RemoveListenersFrom(emitter);
        this.emitters.delete(emitter);
        if (this.emitters.size === 0)
            this.Destroy();
    }
    AddListenersTo(emitter) {
        emitter.addListener("set", this.setCallback);
        emitter.addListener("destroy", this.destroyCallback);
    }
    RemoveListenersFrom(emitter) {
        emitter.removeListener("set", this.setCallback);
        emitter.removeListener("destroy", this.destroyCallback);
    }
}
exports.ScopeBase = ScopeBase;
//# sourceMappingURL=scopeBase.js.map