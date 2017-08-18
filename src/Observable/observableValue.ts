import Emitter from "../emitter";
import Observable from "./observable";

enum ObservableValueType {
    Value,
    Object,
    Array
}

class ObservableValue {
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
        else if( val != null && val != undefined && typeof val === "object" ) {
            this.ConvertToObject();

            var nextObject: { [name: string]: Observable } = 
                typeof this.value === "object" ? this.value : {};
            
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

    constructor(initialValue: any) {
        this.objectProperties = [];
        this.arrayProperties = [];
        this.parentNodes = [];
        this.valueType = ObservableValueType.Value;
        this.Value = initialValue;
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

            node.Fire("set", node);
        }
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
        var self = this;
        properties.forEach((c, i) => {
            Object.defineProperty(object, c, {
                get: () => {               
                    return self.value[c];
                },
                set: (val) => {
                    (self.value[c] as Observable).SetValue(val);
                },
                enumerable: true,
                configurable: true
            });
        });
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
        var self = this;
        Object.defineProperty(object, "length", {
            get: () => {
                return self.value.length;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "push", {
            value: function(newVal: any) {
                self.AddPropertiesToParents([self.value.length]);
                var newObs = new Observable(newVal);
                self.value.push(newObs);
                self.FireEvent("set");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "splice", {
            value: function(startIndex: number, count: number, ...args: Array<any>) {
                if(count === undefined)
                    count = self.value.length - startIndex;

                startIndex = self.value.length < startIndex ? self.value.length : startIndex;
                var startProperties = self.Properties;

                var ret: Array<Observable> = [];
                for(var i=0; i<count && i + startIndex < self.value.length; i++) {
                    ret.push(self.value[startIndex + i].GetValue().valueOf());
                }

                for(var x=0; x<args.length; x++) {
                    if(startIndex + x < self.value.length)
                        self.value[startIndex + x].SetValue(args[x]);
                    else
                        self.value.push(new Observable(args[x]));
                }

                if(count > args.length)
                    self.value.splice(startIndex + args.length, count - args.length);

                self.ReconcileProperties(startProperties);
                self.FireEvent("set");
                return ret;
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
    }
}

namespace ObservableValue {
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

export default ObservableValue;