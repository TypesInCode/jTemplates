import { Emitter } from "../emitter";
export declare class Value<T> {
    private valuePath;
    Value: T;
    constructor(valuePath: string);
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
