"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
class Scope extends emitter_1.Emitter {
    constructor(getFunction, setFunction) {
        super();
        this.getFunction = getFunction;
        this.setFunction = setFunction;
        this.trackedEmitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    get Value() {
        globalEmitter_1.globalEmitter.Register(this);
        if (!this.dirty)
            return this.value;
        this.UpdateValue();
        return this.value;
    }
    set Value(val) {
        this.setFunction && this.setFunction(val);
    }
    Scope(getFunction, setFunction) {
        return new Scope(() => getFunction(this.Value), (val) => setFunction(this.Value, val));
    }
    Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }
    UpdateValue() {
        var newEmitters = globalEmitter_1.globalEmitter.Watch(() => {
            try {
                this.value = this.getFunction();
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