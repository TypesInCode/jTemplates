import { Emitter } from '../emitter';
import { globalEmitter} from './globalEmitter';

export class Scope<T> extends Emitter {
    private getFunction: {(): Promise<T> | T};
    private defaultValue: T;
    private trackedEmitters: Set<Emitter>;
    private dirty: boolean;
    private updating: boolean;
    private value: any;
    private setCallback: () => void;

    public get Value(): T {
        globalEmitter.Register(this);
        if(!this.dirty)
            return this.value;
        
        this.UpdateValue();
        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }

    constructor(getFunction: {(): Promise<T> | T}, defaultValue?: T) {
        super();
        this.getFunction = getFunction;
        this.defaultValue = defaultValue;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.dirty = true;
        this.UpdateValue();
        //this.dirty = true;
    }

    public Scope<O>(getFunction: {(val: T): O}, defaultValue?: O): Scope<O> {
        return new Scope(() => getFunction(this.Value), defaultValue);
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private async UpdateValue() {
        if(this.updating)
            return;
        
        this.updating = true;
        var value = null;
        var newEmitters = globalEmitter.Watch(() => {
            try {
                value = this.getFunction();
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
        
        this.value = await value;
        this.dirty = false;
        this.updating = false;
        this.emit("set");
    }

    private SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}