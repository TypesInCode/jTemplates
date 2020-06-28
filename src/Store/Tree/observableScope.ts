import { Emitter } from "../../Utils/emitter";

export class ObservableScope<T> {
    protected getFunction: {(): T};
    protected value: T;
    protected dirty: boolean;
    protected emitter: Emitter;

    private emitters: Set<Emitter>;
    private setCallback: () => void;
    private watchMap: Map<{(scope: ObservableScope<T>): void}, {(): void}>;

    public get Emitter() {
        return this.emitter;
    }

    public get Value(): T {        
        ObservableScope.Register(this.emitter);
        this.UpdateValue();
        return this.value;
    }

    constructor(getFunction: {(): T} | T) {
        this.emitter = new Emitter();
        this.emitters = new Set();
        this.setCallback = this.SetCallback.bind(this);

        if(typeof getFunction === 'function') {
            this.getFunction = getFunction as {(): T};
            this.dirty = true;
        }
        else {
            this.value = getFunction;
            this.dirty = false;
        }
    }

    public Scope<O>(callback: {(parent: T): O}): ObservableScope<O> {
        return new ObservableScope<O>(() => callback(this.Value));
    }

    public Watch(callback: {(scope: ObservableScope<T>): void}) {
        this.watchMap = this.watchMap || new Map();
        var onSet = () => callback(this);
        this.watchMap.set(callback, onSet);
        this.emitter.On("set", onSet);
    }

    public Unwatch(callback: {(scope: ObservableScope<T>): void}) {
        if(!this.watchMap)
            return;

        this.emitter.Remove("set", this.watchMap.get(callback));
    }

    public Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.watchMap && this.watchMap.clear();
        this.emitters.clear();
        this.emitter.Clear();
    }

    protected UpdateValue() {
        if(!this.dirty)
            return;

        this.dirty = false;
        var value: T = null;
        var emitters = ObservableScope.Watch(() =>
            value = this.getFunction()
        );

        this.UpdateEmitters(emitters);
        this.value = value;
    }

    protected UpdateEmitters(newEmitters: Set<Emitter>) {
        var diff = newEmitters.size !== this.emitters.size;
        this.emitters.forEach(e => {
            if(!newEmitters.has(e)) {
                this.RemoveListenersFrom(e);
                diff = true;
            }
        });

        if(diff)
            newEmitters.forEach(e => 
                this.AddListenersTo(e)
            );

        this.emitters = newEmitters;
    }

    protected SetCallback() {
        if(this.dirty)
            return;
        
        this.dirty = true;
        this.emitter.Emit("set");
    }

    private AddListenersTo(emitter: Emitter) {
        emitter.On("set", this.setCallback);
    }

    private RemoveListenersFrom(emitter: Emitter) {
        emitter.Remove("set", this.setCallback);
    }
}

export namespace ObservableScope {
    var currentSet: Set<Emitter> = null;

    export function Watch(action: {(): void}) {
        var parentSet = currentSet;
        currentSet = new Set();
        action();
        var lastSet = currentSet;
        currentSet = parentSet;
        return lastSet;
    }

    export function Register(emitter: Emitter) {
        if(!currentSet)
            return;

        currentSet.add(emitter);
    }
}