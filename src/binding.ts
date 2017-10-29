import Observable from "./Observable/observable";
import Emitter from "./emitter";

enum BindingStatus {
    Init,
    Updating,
    Updated
}

abstract class Binding<T> extends Emitter {
    private boundTo: T;
    private value: any;
    private bindingFunction: () => any;
    private observables: Array<Observable>;
    private setCallback: (obs: Observable) => void;
    private scheduleUpdate: (callback: () => void) => void;
    private bindingInitialized: boolean;
    private status: BindingStatus;

    protected get Value(): any {
        return this.value;
    }

    protected get BoundTo(): T {
        return this.boundTo;
    }

    constructor(boundTo: T, binding: any, scheduleUpdate: (callback: () => void) => void) {
        super();
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.bindingInitialized = false;
        this.status = BindingStatus.Init;
        this.observables = [];
        this.setCallback = this.Update.bind(this);
        if(typeof binding == 'function')
            this.bindingFunction = binding;
        else
            this.value = binding;
    }

    public Update() {
        if(this.bindingFunction) {
            var obs = Observable.Watch("get", () => {
                this.value = this.bindingFunction();
                if(this.value)
                    this.value = this.value.valueOf();
            });

            var curObs = this.observables;
            for(var x=0; x<obs.length; x++) {
                var ind = curObs.indexOf(obs[x]);
                if(ind < 0)
                    this.AddListeners(obs[x]);
                else
                    curObs.splice(ind, 1);
            }

            for(var y=0; y<curObs.length; y++) {
                this.RemoveListeners(curObs[y]);
            }
            
            this.observables = obs;
        }

        if(this.bindingInitialized) {
            this.Updating();
            this.scheduleUpdate(() => {
                this.Apply();
                this.Updated();
            });
        }
        else {
            this.Apply();
            this.bindingInitialized = true;
        }
    }

    protected abstract Apply(): void;

    public Destroy(): void {
        this.ClearAll();
        this.observables.forEach(c => {
            this.RemoveListeners(c);
        });
        this.value = null;
    }

    protected AddListeners(observable: Observable) {
        observable.AddListener("set", this.setCallback);
    }

    protected RemoveListeners(observable: Observable) {
        observable.RemoveListener("set", this.setCallback);
    }

    protected Updating() {
        if(this.status != BindingStatus.Updating) {
            this.Fire("updating", this);
            this.status = BindingStatus.Updating;
        }
    }

    protected Updated() {
        if(this.status != BindingStatus.Updated) {
            this.Fire("updated", this);
            this.status = BindingStatus.Updated;
        }
    }
}

export default Binding;