"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GlobalEmitter {
    constructor() {
        this.emitterStack = [];
    }
    Watch(callback) {
        this.emitterStack.push(new Set());
        callback();
        return this.emitterStack.pop();
    }
    Register(emitter) {
        if (this.emitterStack.length === 0)
            return;
        var set = this.emitterStack[this.emitterStack.length - 1];
        if (!set.has(emitter))
            set.add(emitter);
    }
}
exports.globalEmitter = new GlobalEmitter();
//# sourceMappingURL=globalEmitter.js.map