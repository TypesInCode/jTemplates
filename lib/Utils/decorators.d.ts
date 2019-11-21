import { Injector as InjectorClass } from "./injector";
export declare function Store(): any;
export declare function Scope(): (target: {
    Destroyables: {
        Destroy: () => void;
    }[];
}, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function Inject<T>(type: {
    new (): T;
}): (target: {
    Injector: InjectorClass;
}, propertyKey: string) => any;
