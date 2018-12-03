"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
class Scope extends emitter_1.Emitter {
    constructor(valueFunction) {
        super();
        this.valueFunction = valueFunction;
        this.trackedEmitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.dirty = true;
    }
    get Value() {
        globalEmitter_1.globalEmitter.Register(this);
        if (!this.dirty)
            return this.value;
        this.UpdateValue();
        return this.value;
    }
    Scope(valueFunction) {
        return new Scope(() => valueFunction(this.Value));
    }
    Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }
    UpdateValue() {
        var newEmitters = globalEmitter_1.globalEmitter.Watch(() => {
            try {
                this.value = this.valueFunction();
            }
            catch (err) {
                console.error(err);
            }
        });
        this.trackedEmitters.forEach(emitter => {
            if (!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
        this.dirty = false;
    }
    SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}
exports.Scope = Scope;
//# sourceMappingURL=objectStoreScope.js.map