export declare function Store(): any;
export declare function Scope(): typeof ScopeDecorator;
declare function ScopeDecorator(target: {
    Destroyables: Set<{
        Destroy: {
            (): void;
        };
    }>;
}, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare function Inject<T>(type: {
    new (): T;
}): any;
export declare function Destroy(): typeof DestroyDecorator;
declare function DestroyDecorator(target: {
    Destroyables: Set<{
        Destroy: {
            (): void;
        };
    }>;
}, propertyKey: string, descriptor?: PropertyDescriptor): any;
export {};
