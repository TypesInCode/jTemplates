import { Emitter } from "../../Utils/emitter";
import { AsyncQueue } from "../../Utils/asyncQueue";

export class ObservableScope<T> {
    protected getFunction: {(): T};
    protected value: T;
    protected async: boolean;
    protected asyncQueue: AsyncQueue<T>;
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
        this.async = false;

        if(typeof getFunction === 'function') {
            this.getFunction = getFunction as {(): T};
            this.async = (this.getFunction as any)[Symbol.toStringTag] === "AsyncFunction";
            this.dirty = true;

            if(this.async)
                this.asyncQueue = new AsyncQueue();
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
        var value: T = null;
        var emitters = ObservableScope.Watch(() =>
            value = this.getFunction()
        );

        this.UpdateEmitters(emitters);

        if(this.async) {
            this.asyncQueue.Stop();
            this.asyncQueue.Add(next =>
                Promise.resolve(value).then(val => next(val))
            );
            this.asyncQueue.OnComplete(val => {
                this.value = val;
                this.emitter.Emit("set");
            });
            this.asyncQueue.Start();
        }
        else
            this.value = value;
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
        if(this.async)
            this.UpdateValue();
        else
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