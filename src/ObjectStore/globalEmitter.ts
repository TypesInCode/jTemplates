import Emitter from "../emitter";

class GlobalEmitter {
    private emitterStack: Array<Set<Emitter>> = [];

    public Watch(callback: {(): void}): Set<Emitter> {
        this.emitterStack.push(new Set());
        callback();
        return this.emitterStack.pop();
    }

    public Register(emitter: Emitter) {
        if(this.emitterStack.length === 0)
            return;
        
        var set = this.emitterStack[this.emitterStack.length - 1];
        if(!set.has(emitter))
            set.add(emitter);
    }
}

export var globalEmitter = new GlobalEmitter();