import { ObjectStore } from './objectStore';
import { Emitter } from '../emitter';

export class ObjectStoreScope<T> extends Emitter {
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
        var newEmitters = ObjectStore.Watch(() => {
            try {
                this.value = this.valueFunction();
            }
            catch(err) {
                console.error(err);
            }
        });

        var newSet = new Set<Emitter>(newEmitters);

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