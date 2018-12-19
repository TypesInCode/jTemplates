import Emitter from "../emitter";
import { scopeCollector } from "./scopeCollector";

export abstract class ScopeBase<T> extends Emitter {
    private getFunction: {(...args: Array<any>): T | Promise<T>};
    private emitters: Set<Emitter>;
    private setCallback: () => void;
    private defaultValue: T;
    private value: T;
    private dirty: boolean;
    private isAsync: boolean;

    public get Value(): T {
        scopeCollector.Register(this);
        if(this.dirty)
            this.UpdateValueBase();

        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
    }

    constructor(getFunction: {(...args: Array<any>): T | Promise<T>}, defaultValue?: T) {
        super();
        this.getFunction = getFunction;
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.defaultValue = defaultValue;
        this.dirty = true;
        this.isAsync = false;
    }

    public AsPromise(): Promise<T> {
        return new Promise((resolve) => {
            var temp = this.Value;
            if(!this.isAsync) {
                resolve(temp);
                this.Destroy();
                return;
            }

            this.addListener("set", () => {
                resolve(this.Value);
                this.Destroy();
            });
        });
    }

    public Destroy() {
        this.removeAllListeners();
        this.emitters.forEach(e => e.removeListener("set", this.setCallback));
        this.emitters.clear();
    }

    protected abstract UpdateValue(callback: {(emitters: Set<Emitter>, value: T): void}): void;

    protected GetNewValue(...args: Array<any>): any {
        return this.getFunction(...args);
    }

    private UpdateValueBase() {
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
        this.emitters.forEach(emitter => {
            if(!newEmitters.has(emitter))
                emitter.removeListener("set", this.setCallback);
        });

        while(newEmitters.has(this))
            newEmitters.delete(this);
            
        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
        this.emitters = newEmitters;
    }

    private SetCallback() {
        this.dirty = true;
        this.emit("set");
    }
}