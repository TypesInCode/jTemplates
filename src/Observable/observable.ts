import Emitter from "../emitter";

export enum ValueType {
    Unknown,
    Value,
    Object,
    Array
}

var JsonObj = {};
function GetValueType(value: any): ValueType {
    if(Array.isArray(value))
        return ValueType.Array;
    
    if(value && typeof value === "object" && value.constructor === JsonObj.constructor)
        return ValueType.Object;

    return ValueType.Value;
}

export class ObservableValue {
    private __observableReference: Observable;
    public get ObservableReference() {
        return this.__observableReference;
    }

    constructor(parent: Observable) {
        this.__observableReference = parent;
    }

    public valueOf() {
        return this.ObservableReference.Value;
    }

    public toString() {
        var val = this.ObservableReference.Value;
        return val && val.toString();
    }
}

var sharedEmitter = new Emitter();

export class Observable extends Emitter {
    private _joinedObservable: Observable;
    private _properties: Set<string | number>;
    private _value: any;
    private _valueType: ValueType;
    private _observableValue: ObservableValue;
    private _setCallback: { (value: Observable): void };

    public get Properties() {
        return this._properties.values();
    }

    public get Type() {
        return this._valueType;
    }

    public get Value() {
        this.Fire("get");
        return this._value;
    }

    public set Value(val: any | ObservableValue) {
        if(this._joinedObservable) {
            this._joinedObservable.Value = val;
            return;
        }

        if(val instanceof ObservableValue)
            val = Observable.Unwrap(val);
        else if(val instanceof Observable)
            val = Observable.Unwrap(val.ObservableValue);

        if(this._value !== val) {
            this.ReconcileRawValue(val);
            this.Fire("set");
        }
    }

    public get ObservableValue() {
        return this._observableValue;
    }

    constructor(value?: Observable | any) {
        super();
        this._valueType = ValueType.Unknown;
        this._properties = new Set();
        this._setCallback = this.SetCallback.bind(this);
        this._observableValue = new ObservableValue(this);

        if(value != undefined)
            this.Value = value;
    }

    public Fire(name: string, ...args: any[]) {
        super.Fire(name, ...args);
        sharedEmitter.Fire(name, this, ...args);
    }

    public Join(observable: Observable | ObservableValue | any) {
        if(this._joinedObservable === observable)
            return;
        
        if(this._joinedObservable)
            this.Unjoin();

        if(observable instanceof ObservableValue)
            observable = observable.ObservableReference;
        else if(!(observable instanceof Observable)) {
            this.Value = observable;
            return;
        }
        
        this._joinedObservable = observable;
        this._joinedObservable.AddListener("set", this._setCallback);
        this.ReconcileJoinedObservable(observable);
        this.Fire("set");
    }

    public Unjoin() {
        if(!this._joinedObservable)
            return;

        for(var prop in this.Properties) {
            var obsValue = (this._value as any)[prop] as ObservableValue;
            obsValue.ObservableReference.Unjoin();
        }

        this._joinedObservable.RemoveListener("set", this._setCallback);
        this._joinedObservable = null;
    }

    public Destroy() {
        this.ClearAll();
        this.DeleteProperties([...(this.Properties as any)]);
    }

    private SetCallback(observable: Observable) {
        this.ReconcileJoinedObservable(observable);
        this.Fire("set");
    }

    private ConvertToType(newType: ValueType) {
        if(this._valueType === newType)
            return;

        this.DeleteProperties([...(this._properties as any)]);
        this._properties.clear();

        this._valueType = newType;
        switch(this._valueType) {
            case ValueType.Array:
                this._value = [];
                this.AddArrayMixin();
                break;
            case ValueType.Object:
                this._value = {};
                this.RemoveArrayMixin();
                break;
            case ValueType.Value:
                this.RemoveArrayMixin();
                break;
        }
    }

    private ReconcileJoinedObservable(observable: Observable) {
        this.ConvertToType(observable.Type);
        var properties = new Set([...(observable.Properties as any)]);

        if(observable.Type === ValueType.Value)
            this._value = observable.Value;

        var removedProperties = [...(this._properties as any)].filter(c => !properties.has(c));
        properties.forEach(prop => {
            var childObservable = Observable.GetFrom((observable.Value as any)[prop]);
            if(this._properties.has(prop))
                Observable.GetFrom(this._value[prop]).Join(childObservable);
            else
                this._value[prop] = this.DefineProperty(prop, childObservable);
        });

        this.DeleteProperties(removedProperties);
        this._properties = properties;
    }

    private ReconcileRawValue(value: any) {
        var type = GetValueType(value);
        this.ConvertToType(type);

        var properties: Set<string | number> = new Set();
        if(type === ValueType.Array) {
            for(var x=0; x<value.length; x++)
                properties.add(x);
        }
        else if(type === ValueType.Object) {
            for(var key in value)
                properties.add(key);
        }
        else if(type === ValueType.Value)
            this._value = value;

        var removedProperties = [...(this._properties as any)].filter(c => !properties.has(c));
        properties.forEach(prop => {
            if(this._properties.has(prop))
                (this.ObservableValue as any)[prop] = value[prop];
            else
                this._value[prop] = this.DefineProperty(prop, value[prop]);
        });
        
        this.DeleteProperties(removedProperties);
        this._properties = properties;
    }

    private DefineProperty(prop: string | number, value: any) {
        var childObservable = new Observable();
        childObservable.Join(value);
        Object.defineProperty(this.ObservableValue, prop as string, {
            get: () => childObservable.ObservableValue,
            set: (val: any) => childObservable.Value = val,
            enumerable: true,
            configurable: true
        });

        return childObservable.ObservableValue;
    }

    private DeleteProperties(properties: Array<string | number>) {
        if(this.Type === ValueType.Array) {
            for(var x=this._value.length - properties.length; x<this._value.length; x++) {
                (this._value[x] as ObservableValue).ObservableReference.Destroy();
                delete (this.ObservableValue as any)[this._value.length - properties.length + x];
            }

            this._value.splice(this._value.length - properties.length);
        }
        else {
            for(var prop in properties) {
                var obsValue = (this._value as any)[prop] as ObservableValue;
                obsValue.ObservableReference.Destroy();
                delete (this.ObservableValue as any)[prop];
                delete (this._value as any)[prop];
            }
        }
    }

    private AddArrayMixin() {
        Object.defineProperty(this.ObservableValue, "length", {
            get: () => this.Value.length,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "push", {
            value: (newValue: any) => {
                this._value.push(this.DefineProperty(this._value.length, newValue));
                this._properties.add(this._properties.size);
                this.Fire("set");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "join", {
            value: (separator?: string) => {
                return this.Value.join(separator);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(this.ObservableValue, "map", {
            value: (callback: (currentValue: any, index?: number, array?: Array<any>) => any) => {
                return this.Value.map(callback);
            },
            enumerable: false,
            configurable: true
        });
    }
    
    private RemoveArrayMixin() {
        delete (this.ObservableValue as any)["length"];
        delete (this.ObservableValue as any)["push"];
        delete (this.ObservableValue as any)["join"];
        delete (this.ObservableValue as any)["map"];
    }
}

export namespace Observable {

    export function Unwrap(value: ObservableValue | any): any {
        if(!(value instanceof ObservableValue))
            return value;
        
        var obs = value.ObservableReference;
        var returnValue = obs.Type === ValueType.Value ? value.valueOf() : 
            obs.Type === ValueType.Array ? [] : {} as any;

        for(var prop of obs.Properties) {
            returnValue[prop] = Unwrap((value as any)[prop]);
        }

        return returnValue;
    }

    export function Create<T>(value: T): T {
        return (new Observable(value)).ObservableValue as any as T;
    }

    export function Watch(event: string, action: () => void) {
        var ret: Set<Observable> = new Set();
        var callback = (sender: any, obs: Observable) => {
            if(!ret.has(obs))
                ret.add(obs);
        }

        sharedEmitter.AddListener(event, callback);
        action();
        sharedEmitter.RemoveListener(event, callback);

        return ret.values();
    }

    export function GetFrom(value: ObservableValue | any) {
        if(value instanceof ObservableValue)
            return value.ObservableReference;
        
        return null;
    }
}