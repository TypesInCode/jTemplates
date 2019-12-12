import Emitter from "../../Utils/emitter";

/* class ScopeCollector2 {
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

export var ScopeCollector = new ScopeCollector2(); */

export namespace ScopeCollector {
    var currentSet: Set<Emitter> = null;

    export function Watch(action: {(): void}) {
        var parentSet = currentSet;
        currentSet = new Set();
        action();
        var lastSet = currentSet;
        currentSet = parentSet;
        return lastSet;
    }

    export function Register(emitter: Emitter) {
        if(!currentSet)
            return;

        if(!currentSet.has(emitter))
            currentSet.add(emitter);
    }
}