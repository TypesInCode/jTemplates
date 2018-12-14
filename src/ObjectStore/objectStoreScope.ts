import { Emitter } from '../emitter';
import { globalEmitter} from './globalEmitter';

export class Scope<T> extends Emitter {
    private getFunction: {(): Promise<T> | T};
    private trackedEmitters: Set<Emitter>;
    private valuePromise: Promise<T>;
    private setCallback: () => void;

    public get Value(): Promise<T> {
        globalEmitter.Register(this);
        if(this.valuePromise)
            return this.valuePromise;
        
        return this.UpdateValue();
        // return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }

    constructor(getFunction: {(): Promise<T> | T}) {
        super();
        this.getFunction = getFunction;
        this.trackedEmitters = new Set<Emitter>();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
        //this.dirty = true;
    }

    public Scope<O>(getFunction: {(val: T): O}, defaultValue?: O): Scope<O> {
        return new Scope(async () => getFunction(await this.Value));
    }

    public Destroy() {
        this.removeAllListeners();
        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
        this.trackedEmitters.clear();
    }

    private async UpdateValue() {
        if(!this.valuePromise)
            this.valuePromise = new Promise((resolve) => {
                var value = null;
                var newEmitters = globalEmitter.Watch(() => {
                    try {
                        value = this.getFunction();
                    }
                    catch(err) {
                        console.error(err);
                    }
                });

                this.trackedEmitters.forEach(emitter => {
                    if(!newEmitters.has(emitter))
                        emitter.removeListener("set", this.setCallback);
                });

                newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
                this.trackedEmitters = newEmitters;
                resolve(value);
            });

        return this.valuePromise;
        /* if(this.updating)
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

        // var newEmitters = new Set<Emitter>(newEmitters);

        this.trackedEmitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.trackedEmitters = newEmitters;

        this.value = await value;
        this.dirty = false;
        this.emit("set");
        return this.value as T; */
    }

    private SetCallback() {
        this.valuePromise = null;
        this.emit("set");
    }
}