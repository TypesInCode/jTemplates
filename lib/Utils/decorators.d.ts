import { Component } from "../Node/component";
import { NodeRef } from "..";
export declare function Store(): any;
export declare function Scope(): typeof ScopeDecorator;
function ScopeDecorator<T extends Component<any, any, any>, K extends string>(target: T, propertyKey: K, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare function Inject<I>(type: {
    new (): I;
}): <F extends I, T extends Component<any, any, any> & Record<K, F>, K extends string>(target: T, propertyKey: K, descriptor?: PropertyDescriptor) => any;
export declare function Destroy(): typeof DestroyDecorator;
function DestroyDecorator<T extends Component<any, any, any> & Record<K, {
    Destroy: {
        (): void;
    };
}>, K extends string>(target: T, propertyKey: K, descriptor?: PropertyDescriptor): any;
export declare function PreReqTemplate(template: {
    (): NodeRef | NodeRef[];
}): <T extends Component<any, any, any>>(target: new (...args: any[]) => T) => any;
export declare namespace PreReqTemplate {
    function Get(value: any): NodeRef[];
}
export declare function PreReq(): typeof PreReqDecorator;
export declare namespace PreReq {
    function All(value: any): Promise<void[]>;
    function Has(value: any): boolean;
}
declare function PreReqDecorator<T extends Record<K, {
    Init: Promise<void>;
}>, K extends string>(target: T, propertyKey: K): any;
export {};
