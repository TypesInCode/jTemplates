import Emitter from "../emitter";
import { ObservableValue } from "./observableValue";
import { IMirrorTreeNode, JsonTreeNode } from "./jsonTreeNode";

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

function GetNewValues(oldValues: Array<any>, newValues: Array<any>) {
    var uniqueValues: Array<any> = [];
    for(var x=0; x<newValues.length; x++) {
        var v = newValues[x];
        if(oldValues.indexOf(v) < 0)
            uniqueValues.push(v);
    }
    return uniqueValues;
}

function GetOldValues(oldValues: Array<any>, newValues: Array<any>) {
    var uniqueValues: Array<any> = [];
    for(var x=0; x<oldValues.length; x++) {
        var v = oldValues[x];
        if(newValues.indexOf(v) < 0)
            uniqueValues.push(v);
    }
    return uniqueValues;
}

var sharedEmitter = new Emitter();

class Observable extends Emitter {
    private _sourceObservable: Observable;
    private _properties: Array<string | number>;
    private _value: any;
    private _valueType: ValueType;
    private _setCallback: { (observable: Observable): void };

    constructor(initialValue?: any) {
        super();
        this._value = null;
        this._valueType = ValueType.Unknown;
        this._properties = [];
        this._setCallback = this.SetCallback.bind(this);

        if(initialValue)
            this.SetValue(initialValue);
    }

    public GetProperties(): Array<string | number> {
        return this._properties;
    }

    public GetType(): ValueType {
        return this._valueType;
    }

    public GetValue() {
        this.Fire("get");
        return this._value;
    }

    public SetValue(value: any) {
        if(this._sourceObservable) {
            this._sourceObservable.SetValue(value);
            return;
        }

        if(value instanceof Observable)
            value = Observable.Unwrap(value);
        
        this.ReconcileValue(value);
        this.Fire("set");
    }

    public Join(observable: Observable) {
        if(!observable || !(observable instanceof Observable))
            return;
        
        for(var x=0; x<this._properties.length; x++) {
            var prop = this._properties[x];
            (this as any)[prop].Join((observable as any)[prop]);
        }

        this.ReconcileObservable(observable);
        this._sourceObservable = observable;
        this._sourceObservable.AddListener("set", this._setCallback);
        this.Fire("set");
    }

    public UnJoin() {
        this._sourceObservable.RemoveListener("set", this._setCallback);
        this._sourceObservable = null;
    }

    public Destroy() {
        this.ClearAll();
        this.UnJoin();
    }

    public Fire(name: string, ...args: any[]) {
        super.Fire(name, ...args);
        sharedEmitter.Fire(name, this, ...args);
    }

    public valueOf(): any {
        return this.GetValue();
    }

    public toString(): string {
        var value = this.valueOf();
        return value || value.toString();
    }

    private SetCallback(observable: Observable) {
        this.ReconcileObservable(observable);
        this.Fire("set");
    }

    private ReconcileValue(value: any) {
        var type = GetValueType(value);
        this.ConvertToType(type);

        var properties: Array<string | number> = [];
        if(type === ValueType.Array) {
            value = value as Array<any>;
            for(var x=0; x<value.length; x++)
                properties.push(x);
        }
        else if(type === ValueType.Object) {
            for(var key in value)
                properties.push(key);
        }

        this.ReconcileProperties(properties, type, value);
    }

    private ReconcileObservable(observable: Observable) {
        var type = observable.GetType();
        this.ConvertToType(type);
        var properties = observable.GetProperties().slice();
        this.ReconcileProperties(properties, type, observable);
    }

    private ConvertToType(newType: ValueType) {
        if(this._valueType === newType)
            return;

        this.RemoveProperties(this._properties);
        this._properties = [];

        this._valueType = newType;
        switch(this._valueType) {
            case ValueType.Array:
                this._value = [];
                break;
            case ValueType.Object:
                this._value = {};
                break;
        }
    }

    private ReconcileProperties(properties: Array<string | number>, type: ValueType, value: any) {
        var removedProperties: Array<string | number> = GetOldValues(this._properties, properties);
        var addedProperties: Array<string | number> = GetNewValues(this._properties, properties);
        this._properties = properties;

        this.RemoveProperties(removedProperties);
        this.AddProperties(addedProperties, value);

        if(type === ValueType.Value)
            this._value = value && value.valueOf();
    }

    private RemoveProperties(properties: Array<string | number>) {
        for(var x=0; x<properties.length; x++) {
            var p = properties[x];
            var obs: Observable = this._value[p];
            obs.Destroy();
            delete this._value[p];
            delete (this as any)[p];
        }
    }

    private AddProperties(properties: Array<string | number>, value: any) {
        for(var x=0; x<properties.length; x++) {
            var p = properties[x];
            this.DefineProperty(p, value[p]);
        }
    }

    private DefineProperty(property: string | number, value: any) {
        var newObservable = new Observable();
        if(value instanceof Observable)
            newObservable.Join(value);
        else
            newObservable.SetValue(value);

        this._value[property] = newObservable;        
        Object.defineProperty(this, property as string, {
            get: () => this._value[property],
            set: (val: any) => this._value[property].SetValue(val),
            enumerable: true,
            configurable: true
        });
    }
}

namespace Observable {
    /* export function Create<T>(initialValue: T): T & Observable {
        //return new Observable(initialValue) as any as T & Observable;
        return JsonTreeNode.Create(initialValue, Observable);
    }

    export function Unwrap(value: Observable): any {
        //return ObservableValue.Unwrap(node.GetObservableValue());
        return value.GetSourceNode().GetRawValue();
    } */

    export function Create<T>(initialValue: T): T & Observable {
        return new Observable(initialValue) as T & Observable;
    }

    export function Unwrap(observable: Observable) {
        var type = observable.GetType();
        var value = type === ValueType.Value ? observable.valueOf() :
            type === ValueType.Array ? [] : {};
        
        var properties = observable.GetProperties();
        for(var x=0; x<properties[x]; x++) {
            var p = properties[x];
            value[p] = Unwrap((observable as any)[p]);
        }

        return value;
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