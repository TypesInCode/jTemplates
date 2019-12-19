"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../Utils/emitter");
const scopeCollector_1 = require("./scopeCollector");
class Scope extends emitter_1.default {
    constructor(getFunction) {
        super();
        if (typeof getFunction === 'function')
            this.getFunction = getFunction;
        else
            this.getFunction = () => getFunction;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.dirty = true;
    }
    get Value() {
        scopeCollector_1.ScopeCollector.Register(this);
        if (this.dirty) {
            this.dirty = false;
            var emitters = scopeCollector_1.ScopeCollector.Watch(() => this.value = this.getFunction());
            this.UpdateEmitters(emitters);
        }
        return this.value;
    }
    get HasValue() {
        return typeof this.value !== 'undefined';
    }
    Scope(callback) {
        return new Scope(() => callback(this.Value));
    }
    Watch(callback) {
        this.addListener("set", () => callback(this.Value));
        callback(this.Value);
    }
    Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.removeAllListeners();
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
        this.dirty = true;
        this.emit("set");
    }
    AddListenersTo(emitter) {
        emitter.addListener("set", this.setCallback);
    }
    RemoveListenersFrom(emitter) {
        emitter.removeListener("set", this.setCallback);
    }
}
exports.Scope = Scope;
//# sourceMappingURL=scope.js.map