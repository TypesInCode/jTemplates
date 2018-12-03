import { Emitter } from '../emitter';
import { globalEmitter} from './globalEmitter';

export class Scope<T> extends Emitter {
    private valueFunction: {(): T};
    private trackedEmitters: Set<Emitter>;
    private dirty: boolean;
    private value: any;
    private setCallback: () => void;

    public get Value(): T {
        globalEmitter.Register(this);
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
        this.dirty = true;
    }

    public Scope<O>(valueFunction: {(val: T): O}): Scope<O> {
        return new Scope(() => valueFunction(this.Value));
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private UpdateValue() {
        var newEmitters = globalEmitter.Watch(() => {
            try {
                this.value = this.valueFunction();
            }
            catch(err) {
                console.error(err);
            }
        });

        /* var newEmitters = ObjectStore.Watch(() => {
            try {
                this.value = this.valueFunction();
            }
            catch(err) {
                console.error(err);
            }
        }); */

        // var newEmitters = new Set<Emitter>(newEmitters);

        this.trackedEmitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;
        this.dirty = false;
    }

    private SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}