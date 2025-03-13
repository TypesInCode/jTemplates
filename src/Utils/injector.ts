/**
 * Simple scoped dependency injection class. Manages types/instances as key/value pairs.
 */
export class Injector {

    private parent: Injector;
    private typeMap: Map<any, any>;

    constructor() {
        this.parent = Injector.Current();
        this.typeMap = new Map();
    }

    /**
     * Get instance/value based on a key type. Searches for a match
     * through all parent Injectors.
     * 
     * @param type Key to retrieve from the Injector map
     */
    public Get<T>(type: any): T {
        if(this.typeMap.size === 0)
            return this.parent && this.parent.Get(type);
        
        var ret = this.typeMap.get(type);

        if(!ret)
            ret = this.parent && this.parent.Get(type);

        return ret;
    }

    /**
     * Set instance/value based on a key type at this scope.
     * 
     * @param type Type key
     * @param instance Value instance for this type key
     */
    public Set<T>(type: any, instance: T) {
        this.typeMap.set(type, instance);
    }

}

export namespace Injector {
    var scope: Injector = null;

    /**
     * Get the current Injector scope.
     */
    export function Current() {
        return scope;
    }

    /**
     * Creates a child scope with the passed Injector instance.
     * 
     * @param injector Injector instance for this scope
     * @param action Callback to invoke for this scope
     */
    export function Scope<R = void, P extends any[] = []>(injector: Injector, action: {(...args: P): R}, ...args: P): R {
        var parent = Current();
        scope = injector;
        const ret = action(...args);
        scope = parent;
        return ret;
    }
}