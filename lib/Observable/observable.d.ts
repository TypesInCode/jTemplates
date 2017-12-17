import Emitter from "../emitter";
export declare enum ValueType {
    Unknown = 0,
    Value = 1,
    Object = 2,
    Array = 3,
}
declare class Observable extends Emitter {
    private _sourceObservable;
    private _properties;
    private _value;
    private _valueType;
    private _setCallback;
    constructor(initialValue?: any);
    GetProperties(): Array<string | number>;
    GetType(): ValueType;
    GetValue(): any;
    SetValue(value: any): void;
    Join(observable: any): void;
    UnJoin(): void;
    Destroy(): void;
    Fire(name: string, ...args: any[]): void;
    valueOf(): any;
    toString(): string;
    private SetCallback(observable);
    private ReconcileValue(value);
    private ReconcileObservable(observable);
    private ConvertToType(newType);
    private ReconcileProperties(properties, type, value);
    private RemoveProperties(properties);
    private AddProperties(properties, value);
}
declare namespace Observable {
    function Create<T>(initialValue: T): T & Observable;
    function Unwrap(observable: Observable): any;
    function Watch(event: string, action: () => void): Array<Observable>;
}
export default Observable;
