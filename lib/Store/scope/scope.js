"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../Utils/emitter");
const scopeCollector_1 = require("./scopeCollector");
class Scope {
    constructor(getFunction) {
        if (typeof getFunction === 'function')
            this.getFunction = getFunction;
        else
            this.getFunction = () => getFunction;
        this.emitter = new emitter_1.default();
        this.dirty = true;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    get Value() {
        scopeCollector_1.ScopeCollector.Register(this.emitter);
        this.UpdateValue();
        return this.value;
    }
    Scope(callback) {
        return new Scope(() => callback(this.Value));
    }
    Watch(callback) {
        this.emitter.addListener("set", () => callback(this));
        callback(this);
    }
    Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.emitter.removeAllListeners();
    }
    UpdateValue() {
        if (!this.dirty)
            return false;
        this.dirty = false;
        var emitters = scopeCollector_1.ScopeCollector.Watch(() => this.value = this.getFunction());
        this.UpdateEmitters(emitters);
    }
    UpdateEmitters(newEmitters) {
        newEmitters.forEach(e => {
            if (!this.emitters.delete(e))
                this.AddListenersTo(e);
        });
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters = newEmitters;
    }
    SetCallback() {
        if (this.dirty)
            return;
        this.dirty = true;
        this.emitter.emit("set");
    }
    AddListenersTo(emitter) {
        emitter.addListener("set", this.setCallback);
    }
    RemoveListenersFrom(emitter) {
        emitter.removeListener("set", this.setCallback);
    }
}
exports.Scope = Scope;
