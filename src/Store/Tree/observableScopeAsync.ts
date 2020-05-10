import { ObservableScope } from "./observableScope";

export class ObservableScopeAsync<T> extends ObservableScope<T> {

    private promise: Promise<T>;
    private getFunctionAsync: {(): Promise<T>};
    private reject: {(...args: Array<any>): void};

    constructor(getFunctionAsync: {(): Promise<T>}, reject?: {(...args: Array<any>): void}) {
        super(null);
        this.getFunctionAsync = getFunctionAsync;
        this.reject = reject;
        this.dirty = true;
    }

    protected UpdateValue() {
        if(!this.dirty)
            return;

        this.dirty = false;
        var emitters = ObservableScope.Watch(() => 
            this.promise = this.getFunctionAsync()
        );
        this.UpdateEmitters(emitters);
        this.promise.then(val => {
            this.value = val;
            this.emitter.Emit("set");
        }).catch(this.reject);
    }

}