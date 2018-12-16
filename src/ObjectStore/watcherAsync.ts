import Emitter from "../emitter";
import { DeferredPromise } from "./deferredPromise";

class ScopeAsync {
    private emitters: Set<Emitter> = new Set();

    constructor(private watcher: WatcherAsync) { }

    public async Watch(promiseCallback: () => Promise<any>) {
        this.watcher.Scope = this;
        var value = await promiseCallback();
        this.watcher.Scope = null;
        this.watcher.Next();
        return [this.emitters, value];
    }

    public Add(emitter: Emitter) {
        /*if(emitter === this.parent) {
            console.log("skipping parent");
            return;
        }
        
        this.emitters.add(emitter);*/
        if(!this.emitters.has(emitter))
            this.emitters.add(emitter);
    }
}

class WatcherAsync {
    private activeScope: ScopeAsync;
    private deferredQueue: Array<DeferredPromise<ScopeAsync>> = [];

    public set Scope(val: ScopeAsync) {
        this.activeScope = val;
    }

    public Get(): Promise<ScopeAsync> {
        var deferred = new DeferredPromise<ScopeAsync>((resolve) => resolve(new ScopeAsync(this)));
        this.deferredQueue.push(deferred);
        if(this.deferredQueue.length === 1)
            this.deferredQueue[0].Invoke();

        return deferred;
    }
    
    public Next() {
        this.deferredQueue.shift();
        if(this.deferredQueue.length > 0)
            this.deferredQueue[0].Invoke();
    }

    public Register(emitter: Emitter) {
        if(this.activeScope)
            this.activeScope.Add(emitter);
    }
}

export var watcherAsync = new WatcherAsync();