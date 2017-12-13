import Observable from "./observable";
export declare enum ObservableValueType {
    Unknown = 0,
    Value = 1,
    Object = 2,
    Array = 3,
}
export declare class ObservableValue {
    private value;
    private valueType;
    private objectProperties;
    private arrayProperties;
    private parentNodes;
    readonly Properties: Array<any>;
    readonly ValueType: ObservableValueType;
    Value: any;
    constructor();
    valueOf(): any;
    toString(): string;
    RemoveNode(node: Observable): void;
    AddNode(node: Observable): void;
    Join(obsVal: ObservableValue): void;
    Destroy(): void;
    private FireEvent(event);
    private ReconcileProperties(actualProperties);
    private ConvertToArray();
    private ConvertToObject();
    private ConvertToValue();
    private AddPropertiesToParents(properties);
    private AddProperties(object, properties);
    private RemovePropertiesFromValue(properties);
    private RemovePropertiesFromParents(properties);
    private RemoveProperties(object, properties);
    private AddArrayMixinToParents();
    private AddArrayMixin(object);
    private RemoveArrayMixinFromParents();
    private RemoveArrayMixin(object);
}
export declare namespace ObservableValue {
    function Unwrap(value: ObservableValue): any;
}
