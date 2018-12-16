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
    UpdateEmitters(newEmitters) {
        this.trackedEmitters.forEach(emitter => {
            if (!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });
        newEmitters.delete(this);
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
    }
    UpdateValue() {
        this.dirty = false;
        if (!this.isSync) {
            watcher_1.watcher.WatchAsync(() => __awaiter(this, void 0, void 0, function* () {
                var val = this.getFunction();
                var promise = Promise.resolve(val);
                this.isSync = promise !== val;
                this.value = yield promise;
            })).then(emitters => {
                this.UpdateEmitters(emitters);
                this.emit("set");
            });
        }
        else {
            var syncEmitters = watcher_1.watcher.Watch(() => {
                this.value = this.getFunction();
            });
            this.UpdateEmitters(syncEmitters);
        }
    }
    SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}
exports.Scope = Scope;
//# sourceMappingURL=objectStoreScope.js.map