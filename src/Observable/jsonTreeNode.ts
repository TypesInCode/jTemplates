import { Emitter } from "../emitter";
import { type } from "os";

export interface IMirrorTreeNode {
    GetSourceNode(): JsonTreeNode<IMirrorTreeNode>;
    SetSourceNode(sourceNode: JsonTreeNode<IMirrorTreeNode>): void;
    NodeUpdated(): void;
    Destroy(): void;
    valueOf(): any;
}

export enum ValueType {
    Unknown,
    Value,
    Object,
    Array
}

var JsonObj = {};

export class JsonTreeNode<N extends IMirrorTreeNode> {
    private mirrorNodeType: { new(): N };
    private mirroredNodes: Array<N>;
    private objectProperties: Array<string | number>;
    private type: ValueType;
    private value: { [prop: string]: JsonTreeNode<N> };

    public get Type(): ValueType {
        return this.type;
    }

    public get Properties() {
        return this.objectProperties;
    }

    constructor(mirrorNodeType: { new(): N }, properties?: Array<string | number>, type?: ValueType, value?: any) {
        this.mirrorNodeType = mirrorNodeType;
        this.mirroredNodes = [];
        this.objectProperties = properties || [];
        this.type = type || ValueType.Unknown;
        this.value = value || null;
    }

    public CopyNode(): JsonTreeNode<N> {
        return new JsonTreeNode<N>(this.mirrorNodeType, this.objectProperties.slice());
    }

    public AddMirrorNode(mirrorNode: N) {
        this.mirroredNodes.push(mirrorNode);
        this.AddPropertiesTo(this.objectProperties, [mirrorNode]);
        mirrorNode.SetSourceNode(this);
    }

    public RemoveMirroredNode(mirrorNode: N): JsonTreeNode<N> {
        var ind = this.mirroredNodes.indexOf(mirrorNode);
        if(ind < 0)
            return;

        this.mirroredNodes.splice(ind, 1);
        var value: any = this.type === ValueType.Value ? this.value :
            this.type === ValueType.Array ? [] : {};
        
        for(var x=0; x<this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            var childNode = (mirrorNode as any as { [prop: string]: N })[prop];
            var childTreeNode = childNode.GetSourceNode();
            (value as any)[prop] = childTreeNode.RemoveMirroredNode(childNode);
        }
        
        //var cloneNode = this.Clone();
        var cloneNode = new JsonTreeNode<N>(this.mirrorNodeType, this.objectProperties.slice(), this.type, value);
        cloneNode.AddMirrorNode(mirrorNode);
        return cloneNode;
    }

    /* public Clone(): JsonTreeNode<N> {
        var value: any = null;
        if(this.type === ValueType.Value)
            value = this.value;
        else {
            value = this.type === ValueType.Array ? [] : {};
            for(var x=0; x<this.objectProperties.length; x++) {
                var prop = this.objectProperties[x];
                (value as any)[prop] = this.value[prop];
            }
        }

        return new JsonTreeNode<N>(this.mirrorNodeType, this.objectProperties.slice(), this.type, value);
    } */

    public GetValue(): any {
        return this.value;
    }

    public GetRawValue(): any {        
        var value: any = this.type === ValueType.Value ? this.value :
            this.type === ValueType.Array ? [] : {};
        
        for(var x=0; x<this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            value[prop] = this.value[prop].GetRawValue();
        }

        return value;
    }

    public SetValue(newValue: any) {
        var startValue = this.value;
        var startProperties = this.objectProperties.slice();
        var newValueType = this.GetValueType(newValue);

        switch(newValueType) {
            case ValueType.Array:
                this.ConvertToArray();
                newValue = newValue as Array<any>;
                var value = this.value as any as Array<JsonTreeNode<N>>;

                if(newValue.length < value.length) {
                    this.objectProperties.splice(newValue.length);
                }
                else {
                    for(var x=this.objectProperties.length; x<newValue.length; x++)
                        this.objectProperties.push(x);
                }

                break;
            case ValueType.Object:
                this.ConvertToObject();
                newValue = newValue as { [prop: string]: any };

                var newProperties: Array<string> = [];
                for(var key in newValue) {
                    newProperties.push(key);
                }
                this.objectProperties = newProperties;

                break;
            case ValueType.Value:
                this.ConvertToValue();
                this.value = newValue;
                break;
        }

        this.ReconcileProperties(newValue, startProperties, this.objectProperties)
        if(this.type != ValueType.Value || startValue != this.value)
            for(var x=0; x<this.mirroredNodes.length; x++) {
                this.mirroredNodes[x].NodeUpdated();
            }
    }

    public Destroy() {
        this.ResetToNull();

        for(var x=0; x<this.mirroredNodes.length; x++) {
            this.mirroredNodes[x].Destroy();
        }
    }

    private ResetToNull() {
        var value = this.value as { [prop: string]: JsonTreeNode<N> };
        for(var x=0; x<this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            value[prop].Destroy();
        }

        this.RemovePropertiesFrom(this.objectProperties, this.mirroredNodes);
        this.objectProperties = [];

        if(this.type === ValueType.Array)
            this.RemoveArrayMixinFromMirrors();

        this.value = null;
        this.type = ValueType.Value;
    }

    private GetValueType(value: any): ValueType {
        if(Array.isArray(value))
            return ValueType.Array;
        
        if(value && typeof value === "object" && value.constructor === JsonObj.constructor)
            return ValueType.Object;

        return ValueType.Value;
    }

    private ConvertToObject() {
        if(this.type === ValueType.Object)
            return;

        this.ResetToNull();
        this.type = ValueType.Object;
        this.value = {};
    }

    private ConvertToArray() {
        if(this.type == ValueType.Array)
            return;

        this.ResetToNull();
        this.type = ValueType.Array;
        this.value = [] as any;
        this.AddArrayMixinToMirrors();
    }

    private ConvertToValue() {
        if(this.type == ValueType.Value)
            return; 

        this.ResetToNull();
    }

    private ReconcileProperties(newValue: any, oldProperties: Array<string | number>, newProperties: Array<string | number>) {
        var removedProperties: Array<string | number> = [];
        for(var x=0; x<oldProperties.length; x++) {
            if(newProperties.indexOf(oldProperties[x]) < 0)
                removedProperties.push(oldProperties[x]);
        }

        for(var x=0; x<newProperties.length; x++) {
            var prop = newProperties[x];
            if(this.value[prop])
                this.value[prop].SetValue(newValue[prop]);
            else {
                this.value[prop] = new JsonTreeNode<N>(this.mirrorNodeType);
                this.AddPropertiesTo([prop], this.mirroredNodes);
                this.value[prop].SetValue(newValue[prop]);
            }
        }

        this.RemoveProperties(removedProperties);
        this.RemovePropertiesFrom(removedProperties, this.mirroredNodes);
    }

    private RemoveProperties(properties: Array<string | number>) {
        var value = this.value as { [prop: string]: JsonTreeNode<N> };

        if(this.type === ValueType.Array) {
            var removed = (value as any as Array<JsonTreeNode<N>>).splice((this.value as any as Array<any>).length - properties.length);
            for(var x=0; x<removed.length; x++)
                removed[x].Destroy();
        }
        else {
            for(var x=0; x<properties.length; x++) {
                var prop = properties[x];
                value[prop].Destroy();
                delete value[prop];
            }
        }
    }

    private RemovePropertiesFrom(properties: Array<string | number>, mirrors: Array<IMirrorTreeNode>) {    
        for(var x=0; x<mirrors.length; x++) {
            var mirror = mirrors[x] as any as { [prop: string]: IMirrorTreeNode };
            for(var y=0; y<properties.length; y++) {
                var prop = properties[y];
                delete mirror[prop];
            }
        }
    }

    private AddPropertiesTo(properties: Array<string | number>, mirrors: Array<IMirrorTreeNode>) {
        for(var x=0; x<properties.length; x++) {
            var prop = properties[x];
            var value = this.value[prop];
            
            for(var y=0; y<mirrors.length; y++) {
                var mirror = mirrors[y];
                var childMirror = (mirror as any as { [prop: string]: N })[prop] || new this.mirrorNodeType();
                value.AddMirrorNode(childMirror);
                this.DefineProperty(mirror, prop, childMirror);
            }
        }
    }

    private DefineProperty(mirror: IMirrorTreeNode, property: string | number, value: IMirrorTreeNode) {
        (mirror as any as { [prop: string]: N })[property] || Object.defineProperty(mirror, property as string, {
            get: () => value,
            set: (val: any) => value.GetSourceNode().SetValue(val),
            enumerable: true,
            configurable: true
        });
    }

    private AddArrayMixinToMirrors() {
        for(var x=0; x<this.mirroredNodes.length; x++) {
            this.AddArrayMixin(this.mirroredNodes[x]);
        }
    }

    private AddArrayMixin(object: IMirrorTreeNode) {
        var array = object as any as Array<any>
        Object.defineProperty(object, "length", {
            get: () => (object.valueOf() as any as Array<any>).length,
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "reduce", {
            value: (reduceCallback: { (accumulator: any, currentValue: any, currentIndex: number, array: Array<any>): Array<any> }, initialValue: any) => {
                for(var x=0; x<array.length; x++) {
                    initialValue = reduceCallback(initialValue, array[x], x, array);
                }
                return initialValue;
            },
            enumerable: false,
            configurable: true
        });
    }

    private RemoveArrayMixinFromMirrors() {
        for(var x=0; x<this.mirroredNodes.length; x++) {
            this.RemoveArrayMixin(this.mirroredNodes[x]);
        }
    }

    private RemoveArrayMixin(object: {}) {
        delete (object as any)["length"];
        delete (object as any)["reduce"];
    }
}

export namespace JsonTreeNode {
    export function Create<T, N extends IMirrorTreeNode>(value: T, nodeType: { new(): N }): N & T {
        var jsonNode = new JsonTreeNode<N>(nodeType);
        var mirrNode = new nodeType();
        jsonNode.AddMirrorNode(mirrNode);
        jsonNode.SetValue(value);
        return mirrNode as N & T;
    }
}

export default JsonTreeNode;