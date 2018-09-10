import { ProxyObservable } from './proxyObservable';
import { Emitter } from '../emitter';

export class ProxyObservableScope<T> extends Emitter {
    private valueFunction: {(): T};
    private trackedEmitters: Set<Emitter>;
    private dirty: boolean;
    private value: any;
    private setCallback: () => void;

    public get Value(): T {
        if(!this.dirty)
            return this.value;
        
        this.UpdateValue();
        return this.value;
    }

    public get Dirty(): boolean { 
        return this.dirty;
    }

    constructor(valueFunction: {(): T}) {
        super();
        this.valueFunction = valueFunction;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private UpdateValue() {
        var newEmitters = ProxyObservable.Watch(() => {
            this.value = this.valueFunction();
        });

        var newSet = new Set<Emitter>([...(newEmitters as any)]);

        this.trackedEmitters.forEach(emitter => {
            if(!newSet.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newSet.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newSet;
        this.dirty = false;
    }

    private SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}