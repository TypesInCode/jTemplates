import Observable from "./Observable/observable";

interface BindingFunction {
    ($model: any): any;
}

interface BindingFactoryMethod<T> {
    (boundTo: {}, model: any): Array<Binding<T>>;
}

abstract class Binding<T> {
    private model: any;
    private boundTo: T;
    private value: any;
    private bindingFunction: BindingFunction;
    private parameters: { [name: string]: any };
    private parameterNames: Array<string>;
    private parameterValues: Array<any>;
    private observables: Array<Observable>;
    private setCallback: (obs: Observable) => void;
    private applyCallback: () => void;
    private scheduleUpdate: (callback: () => void) => void;

    public get BindsChildren(): boolean {
        return false;
    }

    protected get Value(): any {
        return this.value;
    }

    protected get BoundTo(): T {
        return this.boundTo;
    }

    protected get Parameters(): { [name: string]: any } {
        return this.parameters;
    }

    constructor(boundTo: T, expression: string, parameters: { [name: string]: any }, scheduleUpdate: (callback: () => void) =>  void ) {
        this.boundTo = boundTo;
        this.observables = [];
        this.setCallback = (obs) => { this.Update(); };
        this.applyCallback = () => { this.Apply() };
        this.scheduleUpdate = scheduleUpdate;

        this.parameters = parameters;
        this.parameterNames = [];
        this.parameterValues = [];
        for(var key in parameters) {
            this.parameterNames.push(key);
            this.parameterValues.push(parameters[key]);
        }
        this.bindingFunction = Binding.ParseExpression(expression, this.parameterNames);
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
        var obs = Observable.Watch("get", () => {
            this.value = this.bindingFunction.apply(this, this.parameterValues);
            if(this.value instanceof Observable)
                this.value.Fire("get", this.value);
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

namespace Binding {
    var expRgx = /{{(.+?)}}/;
    export function ParseExpression(expression: string, parameters: Array<string>): BindingFunction {
        if(!expression)
            expression = "null";

        var params = parameters.slice();
        var parts = expression.split(expRgx);
        if(parts.length > 1) {
            parts = expression.split(expRgx).map((c, i) => {
                if( i % 2 == 0 )
                    return `"${c}"`;
                else
                    return `(${c})`;
            });
        }
        
        var merge = parts.join(" + ").replace(/[\n\r]/g, "");
        var funcStr = `return ${merge};`;
        params.push(funcStr);
        var Func = Function.bind(null, ...params);
        return new Func() as BindingFunction;
    }

    export function IsExpression(expression: string): boolean {
        return expRgx.test(expression);
    }
}

export default Binding;