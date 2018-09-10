import { Emitter } from "../emitter";
export declare namespace ProxyObservable {
    class Value {
        private parent;
        private path;
        private prop;
        private readonly value;
        constructor(parent: any, path: string, prop: string);
        __getRealValue(): any;
        toString(): any;
        valueOf(): any;
    }
    function Create<T>(value: T): T;
    function Watch(callback: {
        (): void;
    }): Array<Emitter>;
}
