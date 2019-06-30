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
        if(!ret) {
            this.typeMap.forEach((value, key) => {
                if(value instanceof type)
                    ret = value;
            });
        }

        if(!ret)
            ret = this.parent && this.parent.Get(type);

        return ret;
    }

    public Set<T>(type: { new(...args: Array<any>): T }, instance: T) {
        this.typeMap.set(type, instance);
    }

}

export namespace Injector {
    var currentScopes = new Array<Injector>();

    export function Current() {
        return currentScopes[currentScopes.length - 1];
    }

    export function Scope(injector: Injector, action: {(): void}) {
        currentScopes.push(injector);
        action();
        currentScopes.pop();
    }
}