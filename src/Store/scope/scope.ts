import Emitter from "../../Utils/emitter";
import { ScopeCollector } from "./scopeCollector";

export class Scope<T> {
    private getFunction: {(): T};
    private emitter: Emitter;
    private emitters: Set<Emitter>;
    private setCallback: () => void;
    private value: T;
    private dirty: boolean;

    public get Value(): T {        
        ScopeCollector.Register(this.emitter);
        this.UpdateValue();
        return this.value;
    }

    constructor(getFunction: {(): T} | T) {
        if(typeof getFunction === 'function')
            this.getFunction = getFunction as {(): T};
        else
            this.getFunction = () => getFunction;
        
        this.emitter = new Emitter();
        this.dirty = true;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }

    public Scope<O>(callback: {(parent: T): O}): Scope<O> {
        return new Scope<O>(() => callback(this.Value));
    }

    public Watch(callback: {(scope?: Scope<T>): void}) {
        this.emitter.addListener("set", () => callback(this));
    }

    public Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.emitter.removeAllListeners();
    }

    private UpdateValue() {
        if(!this.dirty)
            return;

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
        if(this.dirty)
            return;
        
        this.dirty = true;
        this.emitter.emit("set");
    }

    private AddListenersTo(emitter: Emitter) {
        emitter.addListener("set", this.setCallback);
    }

    private RemoveListenersFrom(emitter: Emitter) {
        emitter.removeListener("set", this.setCallback);
    }
}