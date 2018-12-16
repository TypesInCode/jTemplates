import Emitter from "../emitter";
import { DeferredPromise } from "./deferredPromise";

class Watcher {
    private emitterStack: Array<Set<Emitter>> = [];
    private asyncQueue: Array<DeferredPromise<any>> = [];
    private processingAsync: boolean = false;

    public Watch(callback: {(): void}): Set<Emitter> {
        this.emitterStack.push(new Set());
        callback();
        return this.emitterStack.pop();
    }

    public WatchAsync(callback: {(): Promise<any>}): Promise<{ emitters: Set<Emitter>, value: any }> {
        var def = new DeferredPromise(resolve => resolve())
        var prom = def.then(() => {
            this.emitterStack.push(new Set());
            return callback();
        }).then((value) => {
            return { emitters: this.emitterStack.pop(), value: value };
        });
        
        this.asyncQueue.push(def);
        this.ProcessAsyncQueue();
        return prom;
    }

    public Register(emitter: Emitter) {
        if(this.emitterStack.length === 0)
            return;
        
        var set = this.emitterStack[this.emitterStack.length - 1];
        if(!set.has(emitter))
            set.add(emitter);
    }

    private ProcessAsyncQueue(recurse?: boolean) {
        if(this.processingAsync && !recurse)
            return;
        
        this.processingAsync = true;
        if(this.asyncQueue.length === 0) {
            this.processingAsync = false;
            return;
        }

        var def = this.asyncQueue.shift();
        def.then(() => {
            this.ProcessAsyncQueue(true);
        });
        def.Invoke();
    }
}

export var watcher = new Watcher();