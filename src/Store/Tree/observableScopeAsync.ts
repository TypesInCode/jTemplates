import { ObservableScope } from "./observableScope";
import { AsyncQueue } from "../../Utils/asyncQueue";

export class ObservableScopeAsync<T> extends ObservableScope<T> {
    private async: boolean;
    private asyncQueue: AsyncQueue<T>;

    constructor(getFunction: {(): T | Promise<T>} | T) {
        super(getFunction as {(): T});

        this.async = this.getFunction && (this.getFunction as any)[Symbol.toStringTag] === "AsyncFunction";
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

        if(this.async && value)
            Promise.resolve(value).then(val => {
                this.value = val;
                this.emitter.Emit("set");
            });
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