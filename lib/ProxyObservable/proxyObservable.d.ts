import { Emitter } from "../emitter";
export declare namespace ProxyObservable {
    class Value {
        private __parent;
        private __path;
        private __prop;
        __value: any;
        constructor(__parent: any, __path: string, __prop: string);
        __getRealValue(): any;
        toString(): any;
        valueOf(): any;
    }
    namespace Value {
        function Assign<T>(target: Value | any, value: T): T;
    }
    function Create<T>(value: T): T;
    function Watch(callback: {
        (): void;
    }): Array<Emitter>;
}
