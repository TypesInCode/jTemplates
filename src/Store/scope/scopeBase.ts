import Emitter from "../../Utils/emitter";
import { scopeCollector } from "./scopeCollector";

export abstract class ScopeBase<T> extends Emitter {
    // private getFunction: {(): T};
    private emitters: Set<Emitter>;
    private setCallback: () => void;
    private destroyCallback: (emitter: Emitter) => void;
    private isStatic: boolean;
    private defaultValue: T;
    private value: T;
    private dirty: boolean;
    private isAsync: boolean;

    public get Value(): T {
        /* if(this.isStatic)
            return this.defaultValue; */
        
        scopeCollector.Register(this);
        if(this.dirty)
            this.UpdateValueBase();

        return !this.HasValue ? this.defaultValue : this.value;
    }
    
    public get HasValue() {
        return typeof this.value !== 'undefined';
    }

    /* protected get GetFunction(): {(): T} {
        return this.getFunction;
    } */

    constructor(defaultValue: T = null) {
        super();
        /* if(typeof getFunction === 'function') {
            this.getFunction = getFunction as {(): T};
            this.defaultValue = defaultValue;
            this.isStatic = false;
        }
        else {
            this.defaultValue = getFunction;
            this.isStatic = true;
        } */

        this.defaultValue = defaultValue;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.destroyCallback = this.DestroyCallback.bind(this);
        this.dirty = true;
        this.isAsync = false;
    }

    /* public AsPromise(): Promise<T> {
        return new Promise((resolve) => {
            var temp = this.Value;
            if(!this.isAsync || this.defaultValue !== temp) {
                resolve(temp);
                return;
            }

            var setCallback = () => {
                resolve(this.Value);
                this.removeListener("set", setCallback);
            };

            this.addListener("set", setCallback);
        });
    } */

    public Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.emit("destroy", this);
        this.removeAllListeners();
    }

    protected abstract UpdateValue(callback: {(emitters: Set<Emitter>, value: T): void}): void;

    protected UpdateValueBase() {
        this.dirty = false;
        var callbackFired = false;
        this.UpdateValue((emitters, value) => {
            callbackFired = true;
            this.UpdateEmitters(emitters);
            this.value = value;
            if(this.isAsync)
                this.emit("set");
        });
        this.isAsync = !callbackFired;
    }

    private UpdateEmitters(newEmitters: Set<Emitter>) {
        this.emitters.forEach(e => {
            if(!newEmitters.has(e)) {
                this.RemoveListenersFrom(e);
            }
        });

        /* while(newEmitters.has(this))
            newEmitters.delete(this); */
            
        newEmitters.forEach(e => {
            this.AddListenersTo(e);
        });
        this.emitters = newEmitters;
    }

    private SetCallback() {
        if(!this.isAsync) {
            this.dirty = true;
            this.emit("set");
        }
        else
            this.UpdateValueBase();
    }

    private DestroyCallback(emitter: Emitter) {
        this.RemoveListenersFrom(emitter);
        this.emitters.delete(emitter);
        if(this.emitters.size === 0)
            this.Destroy();
    }

    private AddListenersTo(emitter: Emitter) {
        emitter.addListener("set", this.setCallback);
        emitter.addListener("destroy", this.destroyCallback);
    }

    private RemoveListenersFrom(emitter: Emitter) {
        emitter.removeListener("set", this.setCallback);
        emitter.removeListener("destroy", this.destroyCallback);
    }
}