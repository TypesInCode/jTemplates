import Emitter from "../emitter";
import Observable from "./observable";

class ObservableScope extends Emitter {
    private observableFunction: {(): any};
    private childObservables: Array<Observable>;
    private dirty: boolean;
    private value: any;
    private setCallback: (obs: Observable) => void;

    public get Value(): any {
        this.Fire("get", this);
        if(!this.dirty)
            return this.value;
        
        this.UpdateValue();
        return this.value;
    }

    constructor(observableFunction: {(): any}) {
        super();
        this.observableFunction = observableFunction;
        this.childObservables = [];
        this.setCallback = this.SetCallback.bind(this);
        this.UpdateValue();
    }

    public Destroy() {
        this.ClearAll();
        for(var x=0; x<this.childObservables.length; x++)
            this.childObservables.forEach(c => this.RemoveListeners(c));
    }

    protected UpdateValue() {
        var newObservables = Observable.Watch("get", () => {
            this.value = this.observableFunction();
            if(this.value instanceof Observable)
                this.value = this.value.valueOf();
        });

        for(var x=0; x<newObservables.length; x++) {
            var ind = this.childObservables.indexOf(newObservables[x]);
            if(ind < 0)
                this.AddListeners(newObservables[x]);
            else
                this.childObservables.splice(ind, 1);
        }

        for(var y=0; y<this.childObservables.length; y++)
            this.RemoveListeners(this.childObservables[y]);
        
        this.childObservables = newObservables;
        this.dirty = false;
    }

    protected SetCallback(observable: Observable) {
        this.dirty = true;
        this.Fire("set", this);
    }

    protected AddListeners(observable: Observable) {
        observable.AddListener("set", this.setCallback);
    }

    protected RemoveListeners(observable: Observable) {
        observable.RemoveListener("set", this.setCallback);
    }
}

export default ObservableScope;