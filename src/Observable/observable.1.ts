import Emitter from "../emitter";
import { ObservableValue } from "./observableValue";

var sharedEmitter = new Emitter();

class Observable extends Emitter {
    private observableValue: ObservableValue;

    public get IsArray(): boolean {
        return Array.isArray(this.observableValue.valueOf());
    }

    constructor(initialValue: any) {
        super();
        this.observableValue = new ObservableValue();
        this.observableValue.AddNode(this);
        this.SetValue(initialValue);
    }

    public Fire(name: string, ...args: any[]) {
        super.Fire(name, ...args);
        sharedEmitter.Fire(name, this, ...args);
    }

    public Join(obs: any) {
        if(!(obs instanceof Observable)) {
            this.SetValue(obs);
            return;
        }

        var newVal = obs.GetObservableValue();
        this.observableValue.Join(newVal);
    }

    public SetValue(value: any) {
        if(value instanceof Observable)
            value = Observable.Unwrap(value);

        this.observableValue.Value = value;
    }

    public ResetValue(value: any) {
        this.observableValue.RemoveNode(this);
        this.observableValue = new ObservableValue();
        this.observableValue.AddNode(this);
        this.SetValue(value);
    }

    public GetObservableValue(): ObservableValue {
        return this.observableValue;
    }

    public SetObservableValue(val: ObservableValue) {
        this.observableValue = val;
    }

    public Destroy() {
        this.ClearAll();
        this.observableValue.Destroy();
    }

    public valueOf(): any {
        this.Fire("get");
        return this.observableValue.valueOf();
    }

    public toString(): string {
        return this.valueOf().toString();
    }
}

namespace Observable {
    export function Create<T>(initialValue: T): T & Observable {
        return new Observable(initialValue) as any as T & Observable;
    }

    export function Unwrap(node: Observable): any {
        return ObservableValue.Unwrap(node.GetObservableValue());
    }

    export function Watch(event: string, action: () => void): Array<Observable> {
        var ret: Array<Observable> = [];
        var callback = (sender: any, obs: Observable) => {
            var ind = ret.indexOf(obs);
            if(ind < 0)
                ret.push(obs);
        }

        sharedEmitter.AddListener(event, callback);
        action();
        sharedEmitter.RemoveListener(event, callback);

        return ret;
    }
}

export default Observable;