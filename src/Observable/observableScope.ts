import Emitter from "../emitter";
import { Observable, ObservableValue } from "./observable";

class ObservableScope<T> extends Emitter<ObservableScope<T>> {
    private parameters: Array<any>
    private observableFunction: {(...params: any[]): any};
    private childObservables: Set<Observable>;
    private dirty: boolean;
    private value: any;
    private setCallback: (obs: Observable) => void;

    public get Value(): T {
        this.Fire("get", this);
        if(!this.dirty)
            return this.value;
        
        this.UpdateValue();
        return this.value;
    }

    public get Dirty(): boolean { 
        return this.dirty;
    }

    constructor(observableFunction: {(...params: any[]): T}, ...params: Array<any>) {
        super();
        this.parameters = params;
        this.observableFunction = observableFunction;
        this.childObservables = new Set();
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }

    public Destroy() {
        this.ClearAll();
        this.childObservables.forEach(c => c.RemoveListener("set", this.setCallback));
        this.childObservables.clear();
    }

    protected UpdateValue() {
        var newObservables = Observable.Watch("get", () => {
            this.value = this.observableFunction(...this.parameters);
            if(this.value instanceof ObservableValue)
                this.value = this.value.valueOf();
        });

        var newObsSet = new Set([...(newObservables as any)]);

        this.childObservables.forEach(obs => {
            if(!newObsSet.has(obs))
                obs.RemoveListener("set", this.setCallback);
        });

        newObsSet.forEach(obs => obs.AddListener("set", this.setCallback));
        this.childObservables = newObsSet;
        this.dirty = false;
    }

    private SetCallback(observable: Observable) {
        this.dirty = true;
        this.Fire("set");
    }
}

export default ObservableScope;