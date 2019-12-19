export class Injector {

    private parent: Injector;
    private typeMap: Map<any, any>;

    constructor() {
        this.parent = Injector.Current();
        this.typeMap = new Map();
    }

    public Get<T>(type: { new(...args: Array<any>): T }): T {
        if(this.typeMap.size === 0)
            return this.parent && this.parent.Get(type);
        
        var ret = this.typeMap.get(type);

        if(!ret)
            ret = this.parent && this.parent.Get(type);

        return ret;
    }

    public Set<T>(type: { new(...args: Array<any>): T }, instance: T) {
        this.typeMap.set(type, instance);
    }

}

export namespace Injector {
    var scope: Injector = null;
    export function Current() {
        return scope;
    }

    export function Scope(injector: Injector, action: {(): void}) {
        var parent = Current();
        scope = injector;
        action();
        scope = parent;
    }
}