"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Emitter {
    constructor() {
        this.callbackMap = {};
    }
    addListener(name, callback) {
        var events = this.callbackMap[name] || new Set();
        if (!events.has(callback))
            events.add(callback);
        this.callbackMap[name] = events;
    }
    removeListener(name, callback) {
        var events = this.callbackMap[name];
        events && events.delete(callback);
    }
    emit(name, ...args) {
        var events = this.callbackMap[name];
        events && events.forEach(c => c(...args));
    }
    clear(name) {
        var events = this.callbackMap[name];
        events && events.clear();
    }
    removeAllListeners() {
        for (var key in this.callbackMap)
            this.clear(key);
    }
}
exports.Emitter = Emitter;
exports.default = Emitter;
