import { Emitter } from '../emitter';
import { globalEmitter} from './globalEmitter';

export class Scope<T> extends Emitter {
    private getFunction: {(): T};
    private setFunction: {(val: T): void};
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

    public set Value(val: T) {
        this.setFunction && this.setFunction(val);
    }

    constructor(getFunction: {(): T}, setFunction?: {(val: T): void}) {
        super();
        this.getFunction = getFunction;
        this.setFunction = setFunction;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.dirty = true;
    }

    public Scope<O>(getFunction: {(val: T): O}, setFunction?: {(val: T, next: O): void}): Scope<O> {
        return new Scope(() => getFunction(this.Value), (val) => setFunction(this.Value, val));
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private UpdateValue() {
        var newEmitters = globalEmitter.Watch(() => {
            try {
                this.value = this.getFunction();
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