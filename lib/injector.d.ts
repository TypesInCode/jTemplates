export declare class Injector {
    private parent;
    private typeMap;
    constructor();
    Get<T>(type: {
        new (...args: Array<any>): T;
    }): T;
    Set<T>(type: {
        new (...args: Array<any>): T;
    }, instance: T): void;
}
export declare namespace Injector {
    function Current(): Injector;
    function Scope(injector: Injector, action: {
        (): void;
    }): void;
}
