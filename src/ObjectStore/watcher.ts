import Emitter from "../emitter";
import { DeferredPromise } from "./deferredPromise";

class Watcher {
    private emitterStack: Array<Set<Emitter>> = [];
    private asyncQueue: Array<DeferredPromise<any>> = [];

    public Watch(callback: {(): void}): Set<Emitter> {
        this.emitterStack.push(new Set());
        callback();
        return this.emitterStack.pop();
    }

    public WatchAsync(callback: {(): Promise<any>}): Promise<Set<Emitter>> {
        var def = new DeferredPromise(resolve => resolve())
        var prom = def.then(async () => {
            this.emitterStack.push(new Set());
            await callback();
            return this.emitterStack.pop();
        });
        
        this.asyncQueue.push(def);

        return prom as Promise<Set<Emitter>>;
    }

    public Register(emitter: Emitter) {
        if(this.emitterStack.length === 0)
            return;
        
        var set = this.emitterStack[this.emitterStack.length - 1];
        if(!set.has(emitter))
            set.add(emitter);
    }

    private ProcessAsyncQueue() {
        if(this.asyncQueue.length === 0)
            return;

        var def = this.asyncQueue.shift();
        def.then(() => this.ProcessAsyncQueue());
        def.Invoke();
    }
}

export var watcher = new Watcher();