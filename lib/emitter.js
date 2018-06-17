"use strict";
class Emitter {
    constructor() {
        this.callbackMap = {};
        this.removedEvents = [];
    }
    AddListener(name, callback) {
        var events = this.callbackMap[name] || new Set();
        if (!events.has(callback))
            events.add(callback);
        this.callbackMap[name] = events;
    }
    RemoveListener(name, callback) {
        var events = this.callbackMap[name];
        events && events.delete(callback);
    }
    Fire(name, ...args) {
        var events = this.callbackMap[name];
        events && events.forEach(c => c(this, ...args));
    }
    Clear(name) {
        var events = this.callbackMap[name];
        events && events.clear();
    }
    ClearAll() {
        for (var key in this.callbackMap)
            this.Clear(key);
    }
}
exports.Emitter = Emitter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Emitter;
//# sourceMappingURL=emitter.js.map