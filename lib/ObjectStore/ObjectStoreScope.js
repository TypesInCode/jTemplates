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
const emitter_1 = require("../emitter");
const globalEmitter_1 = require("./globalEmitter");
class Scope extends emitter_1.Emitter {
    constructor(getFunction) {
        super();
        this.getFunction = getFunction;
        this.trackedEmitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }
    get Value() {
        globalEmitter_1.globalEmitter.Register(this);
        if (this.valuePromise)
            return this.valuePromise;
        return this.UpdateValue();
    }
    Scope(getFunction, defaultValue) {
        return new Scope(() => __awaiter(this, void 0, void 0, function* () { return getFunction(yield this.Value); }));
    }
    Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }
    UpdateValue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.valuePromise)
                this.valuePromise = new Promise((resolve) => {
                    var value = null;
                    var newEmitters = globalEmitter_1.globalEmitter.Watch(() => {
                        try {
                            value = this.getFunction();
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
                    resolve(value);
                });
            return this.valuePromise;
        });
    }
    SetCallback() {
        this.valuePromise = null;
        this.emit("set");
    }
}
exports.Scope = Scope;
//# sourceMappingURL=objectStoreScope.js.map