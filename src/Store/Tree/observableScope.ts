import { Emitter } from "../../Utils/emitter";

export class ObservableScope<T> {
    protected getFunction: {(): T};
    protected value: T;
    protected dirty: boolean;
    protected emitter: Emitter;

    private emitters: Set<Emitter>;
    private setCallback: () => void;

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
            // this.UpdateValue();
        }
        else {
            this.value = getFunction;
            this.dirty = false;
            // this.getFunction = () => getFunction;
        }
    }

    public Scope<O>(callback: {(parent: T): O}): ObservableScope<O> {
        return new ObservableScope<O>(() => callback(this.Value));
    }

    public Watch(callback: {(scope: ObservableScope<T>): void}) {
        this.emitter.On("set", () => callback(this));
    }

    public Destroy() {
        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters.clear();
        this.emitter.Clear();
    }

    protected UpdateValue() {
        if(!this.dirty)
            return;

        this.dirty = false;
        var emitters = ObservableScope.Watch(() =>
            this.value = this.getFunction()
        );
        this.UpdateEmitters(emitters);
    }

    protected UpdateEmitters(newEmitters: Set<Emitter>) {
        newEmitters.forEach(e => {
            this.emitters.delete(e);
            this.AddListenersTo(e);
        });

        this.emitters.forEach(e => this.RemoveListenersFrom(e));
        this.emitters = newEmitters;
    }

    private SetCallback() {
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