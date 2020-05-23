import { ObservableScope } from "./observableScope";
import { AsyncQueue } from "../../Utils/asyncQueue";

export class ObservableScopeAsync<T> extends ObservableScope<T> {
    private async: boolean;
    private asyncQueue: AsyncQueue<T>;

    constructor(getFunction: {(): T | Promise<T>} | T) {
        super(getFunction as {(): T});

        this.async = this.getFunction && (this.getFunction as any)[Symbol.toStringTag] === "AsyncFunction";
        if(this.async)
            this.asyncQueue = new AsyncQueue();
    }

    public Destroy() {
        super.Destroy();
        this.asyncQueue && this.asyncQueue.Stop();
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

        if(this.value === undefined && 
            !this.async && 
            Promise.resolve(value) === value as any) {
            this.async = true;
            this.asyncQueue = new AsyncQueue();
        }

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

    protected SetCallback() {
        if(this.dirty)
            return;
        
        this.dirty = true;
        if(this.async)
            this.UpdateValue();
        else
            this.emitter.Emit("set");
    }    

}