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
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }
    Scope(getFunction, defaultValue) {
        return new Scope(() => __awaiter(this, void 0, void 0, function* () { return getFunction(yield this.Value); }), defaultValue);
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
        this.emit("set");
    }
    UpdateValue() {
        if (!this.isSync) {
            watcherAsync_1.watcherAsync.Get()
                .then(scope => scope.Watch(() => {
                var val = this.getFunction();
                var promise = Promise.resolve(val);
                this.isSync = promise !== val;
                return promise;
            })).then(resp => {
                this.UpdateScope(resp[0], resp[1]);
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
        this.UpdateValue();
    }
}
exports.Scope = Scope;
//# sourceMappingURL=objectStoreScope.js.map