import Emitter from "../../Utils/emitter";

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