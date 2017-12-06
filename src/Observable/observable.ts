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
        this.SetValue(initialValue);
    }

    public Fire(name: string, ...args: any[]) {
        super.Fire(name, ...args);
        sharedEmitter.Fire(name, ...args);
    }

    public SetValue(value: any) {
        if( value instanceof Observable ) {
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
        }
    }

    public GetValue(): ObservableValue {
        return this.observableValue;
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
        return ObservableValue.Unwrap(node.GetValue());
    }

    export function Watch(event: string, action: () => void): Array<Observable> {
        var ret: Array<Observable> = [];
        var callback = (obs: Observable) => {
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