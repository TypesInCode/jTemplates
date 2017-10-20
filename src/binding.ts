import Observable from "./Observable/observable";
import Syntax from "./Utils/syntax";

/* interface BindingFunction {
    ($model: any): any;
}

interface BindingFactoryMethod<T> {
    (boundTo: {}, model: any): Array<Binding<T>>;
} */

abstract class Binding<T> {
    private boundTo: T;
    private value: any;
    private bindingFunction: () => any;
    private observables: Array<Observable>;
    private setCallback: (obs: Observable) => void;
    private applyCallback: () => void;
    private scheduleUpdate: (callback: () => void) => void;
    private staticBinding: boolean;

    public get BindsChildren(): boolean {
        return false;
    }

    protected get Value(): any {
        return this.value;
    }

    protected get BoundTo(): T {
        return this.boundTo;
    }

    constructor(boundTo: T, binding: any, scheduleUpdate: (callback: () => void) => void) {
        this.boundTo = boundTo;
        this.scheduleUpdate = scheduleUpdate;
        this.applyCallback = () => { this.Apply() };

        if(typeof binding == 'function') {
            this.observables = [];
            this.setCallback = (obs) => { this.Update(); };

            /* this.parameters = parameters;
            this.parameterNames = [];
            this.parameterValues = [];
            for(var key in parameters) {
                this.parameterNames.push(key);
                this.parameterValues.push(parameters[key]);
            } */
            
            this.bindingFunction = binding; //Binding.ParseExpression(expression, this.parameterNames);
            this.staticBinding = false;
        }
        else {
            this.value = binding;
            this.staticBinding = true;
        }
    }

    public Destroy(): void {
        this.observables.forEach(c => {
            c.RemoveListener("set", this.setCallback);
        });
        this.value = null;
    }

    protected AddListeners(observable: Observable) {
        observable.AddListener("set", this.setCallback);
    }

    protected RemoveListeners(observable: Observable) {
        observable.RemoveListener("set", this.setCallback);
    }

    protected ScheduleUpdate(updateCallback: () => void) {
        this.scheduleUpdate(updateCallback);
    }

    protected abstract Apply(): void;

    public Update() {
        if(this.staticBinding) {
            this.ScheduleUpdate(this.applyCallback)
            return;
        }

        var obs = Observable.Watch("get", () => {
            this.value = this.bindingFunction();
            if(this.value)
                this.value = this.value.valueOf();
        });

        var curObs = this.observables;
        for(var x=0; x<obs.length; x++) {
            var ind = curObs.indexOf(obs[x]);
            if(ind < 0) {
                this.AddListeners(obs[x]);
            }
            else
                curObs.splice(ind, 1);
        }

        for(var y=0; y<curObs.length; y++) {
            this.RemoveListeners(curObs[y]);
        }
        
        this.observables = obs;
        this.ScheduleUpdate(this.applyCallback);
    }
}

export default Binding;