import Emitter from "../emitter";
import { ObservableValue } from "./observableValue";
declare class Observable extends Emitter {
    private observableValue;
    readonly IsArray: boolean;
    constructor(initialValue: any);
    Fire(name: string, ...args: any[]): void;
    Join(obs: any): void;
    SetValue(value: any): void;
    ResetValue(value: any): void;
    GetObservableValue(): ObservableValue;
    SetObservableValue(val: ObservableValue): void;
    Destroy(): void;
    valueOf(): any;
    toString(): string;
}
declare namespace Observable {
    function Create<T>(initialValue: T): T & Observable;
    function Unwrap(node: Observable): any;
    function Watch(event: string, action: () => void): Array<Observable>;
}
export default Observable;
