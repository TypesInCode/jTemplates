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
        this.observableValue = new ObservableValue(initialValue);
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

        /* this.observableValue.RemoveNode(this);
        var newVal = obs.GetValue();
        this.observableValue.Join(newVal);
        this.observableValue = newVal;
        this.observableValue.AddNode(this);
        this.Fire("set"); */
    }

    public SetValue(value: any) {
        if(value instanceof Observable)
            value = Observable.Unwrap(value);

        this.observableValue.Value = value;

        /* var setFired = false;
        var rawValue: any = value && value.valueOf();
        if(this.observableValue) {
            this.observableValue.Value = rawValue;
            setFired = true;
        }
        else {
            this.observableValue = new ObservableValue(rawValue);
            this.observableValue.AddNode(this);
        }

        if(value instanceof Observable) {
            if(this.observableValue)
                this.observableValue.RemoveNode(this);
            
            this.observableValue = value.GetValue();
            this.observableValue.AddNode(this);
        }
        else if(!this.observableValue) {
            this.observableValue = new ObservableValue(value);
            this.observableValue.AddNode(this);
        }

        setFired || this.Fire("set"); */


        /* if( value instanceof Observable ) {
            var newValue = value.GetValue();
            if(newValue !== this.observableValue) {
                if(this.observableValue)
                    this.observableValue.RemoveNode(this);
                
                this.observableValue = newValue;
                this.observableValue.AddNode(this);
            }
        }
        else {
            if(this.observableValue)
                this.observableValue.Value = value;
            else {
                this.observableValue = new ObservableValue(value);
                this.observableValue.AddNode(this);
            }
        } */
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