import Emitter from "../emitter";
export declare enum ValueType {
    Unknown = 0,
    Value = 1,
    Object = 2,
    Array = 3
}
export declare class ObservableValue {
    private __observableReference;
    readonly ObservableReference: Observable;
    constructor(parent: Observable);
    valueOf(): any;
    toString(): any;
}
export declare class Observable extends Emitter<Observable> {
    private _joinedObservable;
    private _properties;
    private _value;
    private _valueType;
    private _observableValue;
    private _setCallback;
    readonly Properties: IterableIterator<string | number>;
    readonly Type: ValueType;
    Value: any | ObservableValue;
    readonly ObservableValue: ObservableValue;
    constructor(value?: Observable | any);
    Fire(name: string, ...args: any[]): void;
    Join(observable: Observable | ObservableValue | any): void;
    Unjoin(): void;
    Destroy(): void;
    private SetCallback;
    private ConvertToType;
    private ReconcileJoinedObservable;
    private ReconcileRawValue;
    private DefineProperty;
    private DeleteProperties;
    private AddArrayMixin;
    private RemoveArrayMixin;
}
export declare namespace Observable {
    function Unwrap<T>(value: ObservableValue | T): T;
    function Create<T>(value: T): T;
    function Watch(event: string, action: () => void): IterableIterator<Observable>;
    function GetFrom(value: ObservableValue | any): Observable;
}
