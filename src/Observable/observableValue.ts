import Emitter from "../emitter";
import Observable from "./observable";
import Symbol from "../Utils/symbol";

export enum ObservableValueType {
    Unknown,
    Value,
    Object,
    Array
}

var jsonObj: {} = {};

export class ObservableValue {
    private value: any;
    private valueType: ObservableValueType;
    private objectProperties: Array<string>;
    private arrayProperties: Array<number>;
    private parentNodes: Array<Observable>;

    public get Properties(): Array<any> {
        var props: Array<any> = null;

        switch(this.valueType) {
            case ObservableValueType.Array:
                if(this.arrayProperties.length !== this.value.length) {
                    this.arrayProperties = [];
                    for(var x=0; x<this.value.length; x++)
                        this.arrayProperties.push(x);
                }
                props = this.arrayProperties;
                break;
            case ObservableValueType.Object:
                props = this.objectProperties;
                break;
            case ObservableValueType.Value:
                props = [];
                break;
            case ObservableValueType.Unknown:
                props = [];
                break;
        }

        return props;
    }

    public get ValueType(): ObservableValueType {
        return this.valueType;
    }

    public get Value(): any {
        return this.value;
    }

    public set Value(val: any) {
        var skipEventFiring = false;
        var startProperties = this.Properties;
        if( Array.isArray(val) ) {
            this.ConvertToArray();
            var nextArr: Array<Observable> = 
                Array.isArray(this.value) ? this.value : new Array<Observable>();

            if(val.length === nextArr.length)
                skipEventFiring = true;
            
            for(var x=0; x<val.length; x++) {
                var newVal: any = val[x];
                var curVal = nextArr[x];
                if(curVal)
                    curVal.SetValue(newVal);
                else
                    nextArr[x] = new Observable(newVal);
            }

            if(val.length < nextArr.length)
                nextArr.splice(val.length);

            this.value = nextArr;
        }
        else if( val && typeof val === "object" && val.constructor === jsonObj.constructor ) {
            this.ConvertToObject();

            var nextObject: { [name: string]: Observable } = 
                this.value && typeof this.value === "object" ? this.value : {};
            
            var props = new Array<string>();
            for( var key in val ) {
                var newVal: any = (val as any)[key];
                var curVal = nextObject[key];
                if( curVal ) {
                    curVal.SetValue(newVal);
                }
                else {
                    nextObject[key] = new Observable(newVal);
                }
                props.push(key);
            }

            this.value = nextObject;
            this.objectProperties = props;
        }
        else {
            this.ConvertToValue();
            if(this.value === val)
                skipEventFiring = true;
            else
                this.value = val;
        }

        this.ReconcileProperties(startProperties);
        if(!skipEventFiring) {
            this.FireEvent("set");
        }
    }

    constructor() { //initialValue: any) {
        this.objectProperties = [];
        this.arrayProperties = [];
        this.parentNodes = [];
        this.valueType = ObservableValueType.Unknown;
        //this.Value = initialValue;
    }

    public valueOf(): any {
        return this.Value;
    }

    public toString(): string {
        var val = this.valueOf();
        return val && val.toString();
    }

    public RemoveNode(node: Observable) {
        var ind = this.parentNodes.indexOf(node);
        if( ind >= 0 ) {
            this.parentNodes.splice(ind, 1);
            this.RemoveProperties(node, this.Properties);

            if(this.valueType == ObservableValueType.Array)
                this.RemoveArrayMixin(node);
        }
    }

    public AddNode(node: Observable) {
        var ind = this.parentNodes.indexOf(node);
        if(ind < 0) {
            this.parentNodes.push(node);
            this.AddProperties(node, this.Properties);

            if(this.valueType == ObservableValueType.Array)
                this.AddArrayMixin(node);
        }
    }

    public Join(obsVal: ObservableValue) {
        var value = obsVal.valueOf();
        for(var x=0; x<this.Properties.length; x++) {
            var prop = this.Properties[x];
            if(value && value[prop])
                this.value[prop].Join(value[prop]);
        }

        var parents = this.parentNodes.slice();
        for(var x=0; x<parents.length; x++) {
            var node = parents[x];
            this.RemoveNode(node);
            obsVal.AddNode(node);
            node.SetObservableValue(obsVal);
            node.Fire("set");
        }
    }

    public Destroy() {
        for(var x=0; x<this.Properties.length; x++) {
            var prop = this.Properties[x];
            this.value[prop].Destroy();
            delete this.value[prop];
        }

        var startProperties = this.Properties;
        this.arrayProperties = [];
        this.objectProperties = [];
        this.ReconcileProperties(startProperties);
    }

    private FireEvent(event: string) {
        for( var x=0; x<this.parentNodes.length; x++ )
            this.parentNodes[x].Fire(event, this.parentNodes[x]);
    }

    private ReconcileProperties(actualProperties: Array<string>) {
        var lostProperties = actualProperties.slice();
        var newProperties = this.Properties.slice();
        var addedProperties = new Array<string>();

        for( var x=0; x<newProperties.length; x++ ) {
            var ind = lostProperties.indexOf(newProperties[x]);
            if( ind >= 0 )
                lostProperties.splice(ind, 1);
            else
                addedProperties.push(newProperties[x]);
        }

        this.RemovePropertiesFromValue(lostProperties);
        this.RemovePropertiesFromParents(lostProperties);
        this.AddPropertiesToParents(addedProperties);
    }

    private ConvertToArray() {
        if(this.valueType == ObservableValueType.Array)
            return;

        if(this.valueType == ObservableValueType.Object) {
            this.RemovePropertiesFromParents(this.Properties);
            this.objectProperties = [];
        }

        this.AddArrayMixinToParents();
        this.valueType = ObservableValueType.Array;
    }

    private ConvertToObject() {
        if(this.valueType == ObservableValueType.Object)
            return;

        if(this.valueType == ObservableValueType.Array) {
            this.RemoveArrayMixinFromParents();
            this.RemovePropertiesFromParents(this.Properties);
            this.arrayProperties = [];
        }
        
        this.valueType = ObservableValueType.Object;
    }

    private ConvertToValue() {
        if(this.valueType == ObservableValueType.Value)
            return;
        
        if(this.valueType == ObservableValueType.Array) {
            this.RemoveArrayMixinFromParents();
            this.RemovePropertiesFromParents(this.Properties);
            this.arrayProperties = [];
        }            
        else if(this.valueType == ObservableValueType.Object) {
            this.RemovePropertiesFromParents(this.Properties);
            this.objectProperties = [];
        }

        this.valueType = ObservableValueType.Value;
    }

    private AddPropertiesToParents(properties: Array<string>) {
        for(var x=0; x<this.parentNodes.length; x++)
            this.AddProperties(this.parentNodes[x], properties);
    }

    private AddProperties(object: {}, properties: Array<string>) {
        properties.forEach((c, i) => {
            Object.defineProperty(object, c, {
                get: () => {
                    return this.value[c];
                },
                set: (val) => {
                    (this.value[c] as Observable).SetValue(val);
                },
                enumerable: true,
                configurable: true
            });
        });
    }

    private RemovePropertiesFromValue(properties: Array<string>) {
        if(!this.value)
            return;
        
        for(var x=0; x<properties.length; x++) {
            if(this.value[properties[x]]) {
                this.value[properties[x]].Destroy();
                delete this.value[properties[x]];
            }
        }
    }

    private RemovePropertiesFromParents(properties: Array<string>) {
        for(var x=0; x<this.parentNodes.length; x++)
            this.RemoveProperties(this.parentNodes[x], properties);
    }

    private RemoveProperties(object: {}, properties: Array<string>) {
        for( var x=0; x<properties.length; x++ ) {
            delete (object as any)[properties[x]];
        }
    }

    private AddArrayMixinToParents() {
        for(var x=0; x<this.parentNodes.length; x++) {
            this.AddArrayMixin(this.parentNodes[x]);
        }
    }

    private AddArrayMixin(object: Observable) {
        Object.defineProperty(object, "length", {
            get: () => this.value.length,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "push", {
            value: (newVal: any) => {
                this.AddPropertiesToParents([this.value.length]);
                var newObs = new Observable(newVal);
                var ret = this.value.push(newObs);
                this.FireEvent("set");
                return ret;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "splice", {
            value: (startIndex: number, count: number, ...args: Array<any>) => {
                var startProperties = this.Properties;
                startIndex = startIndex || 0;
                count = typeof count == 'undefined' ? this.value.length - startIndex : count;
                if(startIndex + count > this.value.length)
                    count = this.value.length - startIndex;

                var tailLength = this.value.length - (startIndex + count);
                var tail: Array<Observable> = [];
                for(var x=0; x<tailLength; x++)
                    tail.push(this.value[startIndex + count + x].valueOf());
                
                var ret: Array<Observable> = [];
                for(var x=0; x<count; x++)
                    ret.push(this.value[startIndex + x].valueOf());

                for(var x=0; x<args.length + tailLength; x++) {
                    var index = x + startIndex;
                    var value = x < args.length ? args[x] : tail[x-args.length];
                    if(index < this.value.length)
                        this.value[index].SetValue(value);
                    else
                        this.value.push(new Observable(value));
                }

                this.value.splice(startIndex + args.length + tailLength);
                this.ReconcileProperties(startProperties);
                this.FireEvent("set");
                return ret;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "sort", {
            value: (sortCallback: {(a: any, b: any): number}) => {
                var array = ObservableValue.Unwrap(this) as Array<any>;
                array.sort(sortCallback);
                this.Value = array;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, Symbol.iterator, {
            get: () => {
                return this.valueOf()[Symbol.iterator];
            },
            enumerable: false,
            configurable: true
        });
    }

    private RemoveArrayMixinFromParents() {
        for(var x=0; x<this.parentNodes.length; x++) {
            this.RemoveArrayMixin(this.parentNodes[x]);
        }
    }

    private RemoveArrayMixin(object: {}) {
        delete (object as any)["length"];
        delete (object as any)["push"];
        delete (object as any)["splice"];
        delete (object as any)["sort"];
        delete (object as any)[Symbol.iterator];
    }
}

export namespace ObservableValue {
    export function Unwrap(value: ObservableValue): any {
        if(value.ValueType == ObservableValueType.Value)
            return value.Value;
        
        var returnValue = value.ValueType == ObservableValueType.Array ? [] : {};
        var properties = value.Properties;
        for(var x=0; x<properties.length; x++) {
            (returnValue as any)[properties[x]] = Observable.Unwrap(value.Value[properties[x]]);
        }
        return returnValue;
    }
}