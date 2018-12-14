import Emitter from "../emitter";
import { DeferredPromise } from "./deferredPromise";

class AsyncScope {
    private emitters: Set<Emitter> = new Set();

    constructor(private watcher: AsyncWatcher) { }

    public async Watch(promiseCallback: () => Promise<any>) {
        this.watcher.Scope = this;
        await promiseCallback();
        this.watcher.Scope = null;
        this.watcher.Next();
        return this.emitters;
    }

    public Add(emitter: Emitter) {
        this.emitters.add(emitter);
    }
}

class AsyncWatcher {
    private activeScope: AsyncScope;
    private deferredQueue: Array<DeferredPromise<AsyncScope>> = [];

    public set Scope(val: AsyncScope) {
        this.activeScope = val;
    }

    public Get(): Promise<AsyncScope> {
        var deferred = new DeferredPromise<AsyncScope>((resolve) => resolve(new AsyncScope(this)));
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

export var asyncWatcher = new AsyncWatcher();