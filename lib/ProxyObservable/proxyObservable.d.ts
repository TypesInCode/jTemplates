import { Emitter } from "../emitter";
export declare abstract class Value<T> {
    Value: T;
    constructor();
    protected abstract getValue(): T;
    protected abstract setValue(val: T): void;
    toString(): string;
    valueOf(): Object;
}
export declare namespace Value {
    function Create<T>(valueFunction: {
        (): T;
    }): Value<T>;
}
export declare namespace ProxyObservable {
    interface ProxyObservable {
        __ProxyObservableInterfaceProperty: boolean;
    }
    function Create<T>(value: T): T & ProxyObservable;
    function Destroy(obj: ProxyObservable): void;
    function Watch(callback: {
        (): void;
    }): Array<Emitter>;
}
