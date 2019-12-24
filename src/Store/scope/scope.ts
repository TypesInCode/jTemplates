import Emitter from "../../Utils/emitter";
import { ScopeCollector } from "./scopeCollector";

export class Scope<T> extends Emitter {
    private getFunction: {(): T};
    private emitters: Set<Emitter>;
    private setCallback: () => void;
    private value: T;
    private dirty: boolean;

    public get Value(): T {        
        ScopeCollector.Register(this);
        this.UpdateValue();
        return this.value;
    }
    
    public get HasValue() {
        return typeof this.value !== 'undefined';
    }

    constructor(getFunction: {(): T} | T) {
        super();
        if(typeof getFunction === 'function')
            this.getFunction = getFunction as {(): T};
        else
            this.getFunction = () => getFunction;
        
        this.dirty = true;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }

    public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope<O>(() => callback(this.Value));
    }

    public Watch(callback: {(value: T): void}) {
        this.addListener("set", () => callback(this.Value));
        callback(this.Value);
    }

    public Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.removeAllListeners();
    }

    private UpdateValue() {
        if(!this.dirty)
            return false;

        this.dirty = false;
        var emitters = ScopeCollector.Watch(() =>
            this.value = this.getFunction()
        );
        this.UpdateEmitters(emitters);
    }

    private UpdateEmitters(newEmitters: Set<Emitter>) {
        newEmitters.forEach(e => {
            if(!this.emitters.delete(e))
                this.AddListenersTo(e);
        });

        this.emitters.forEach(e => 
            this.RemoveListenersFrom(e)
        );

        this.emitters = newEmitters;
    }

    private SetCallback() {
        this.dirty = true;
        this.emit("set");
    }

    private AddListenersTo(emitter: Emitter) {
        emitter.addListener("set", this.setCallback);
    }

    private RemoveListenersFrom(emitter: Emitter) {
        emitter.removeListener("set", this.setCallback);
    }
}