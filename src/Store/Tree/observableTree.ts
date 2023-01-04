import { IObservableScope, ObservableScope } from "../Tree/observableScope";

enum Type {
    Value,
    Object,
    Array
}

const jsonConstructor = {}.constructor;
function TypeOf(value: any): Type {
    if(!value)
        return Type.Value;

    if(jsonConstructor === value.constructor)
        return Type.Object;

    if(Array.isArray(value))
        return Type.Array;

    return Type.Value;
}

export class ObservableTree {

    private undefinedScope = ObservableScope.Create(function() { return undefined as any; });

    private scopeCache = new WeakMap<any, IObservableScope<any>>();
    private leafScopeCache = new WeakMap<any, { [prop: string]: IObservableScope<any> }>();
    private proxyCache = new WeakMap<any, any>();
    private pathCache = new WeakMap<any, string>();
    private rootStateMap = new Map<string, any>();

    constructor(private valuePathResolver?: { (value: string): string | undefined }) 
    { }

    public Get<O>(path: string) {
        const val = path.split(".").reduce((pre: any, curr: string, index) => {
            if(index === 0) {
                let value = this.rootStateMap.get(curr);
                /* if(!value) {
                    value = {};
                    this.pathCache.set(value, path);
                } */
                const scope = this.GetParentScope(value);
                return ObservableScope.Value(scope);
            }

            return pre && pre[curr];
        }, null);

        return val as O;
    }

    public GetPathOf(value: any) {
        if(value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();

        return this.pathCache.get(value);
    }

    public Scope<O, R = O>(path: string, callback?: {(obj: O): R}) {
        return new ObservableScope(() => {
            const obj = this.Get<O>(path);
            return callback && callback(obj) || obj;
        });
    }

    public Write(path: string, value: any): void {
        const scope = this.WritePath(path, value);
        ObservableScope.Update(scope);
    }

    public WriteAll(data: Array<{ path: string, value: any }>) {
        const scopeSet = new Set<IObservableScope<any>>();
        for(var x=0; x<data.length; x++) {
            const scope = this.WritePath(data[x].path, data[x].value);
            scopeSet.add(scope);
        }

        scopeSet.forEach(scope => ObservableScope.Update(scope));
    }

    private GetParentScope(value: any): IObservableScope<any> {
        const type = TypeOf(value);
        if(type === Type.Value) {
            if(this.valuePathResolver && typeof value === 'string') {
                const path = this.valuePathResolver(value);
                if(path) {
                    const val = this.rootStateMap.get(path);
                    return this.GetParentScope(val);
                }
            }
            return value === undefined ? this.undefinedScope : ObservableScope.Create(value);
        }

        let scope = this.scopeCache.get(value);
        if(!scope) {
            scope = ObservableScope.Create(() => this.GetValueProxy(value));
            this.scopeCache.set(value, scope);
        }

        return scope;
    }

    private GetPropertyScope(parent: any, prop: any) {
        const value = parent[prop];
        const type = TypeOf(value);
        if(type === Type.Value) {
            let leafScopes = this.leafScopeCache.get(parent) || {};
            leafScopes[prop] = leafScopes[prop] || ObservableScope.Create(() => {
                const parentScope = this.scopeCache.get(parent);
                const parentValue = ObservableScope.Value(parentScope);
                const parentJson = parentValue.toJSON();
                const currentValue = parentJson[prop];

                let path: string;
                if(this.valuePathResolver && typeof currentValue === 'string' && (path = this.valuePathResolver(currentValue)))
                    return this.Get(path);

                return currentValue;
            });
            this.leafScopeCache.set(parent, leafScopes);
            return leafScopes[prop];
        }
        else {
            let scope = this.scopeCache.get(value);
            if(!scope) {
                scope = ObservableScope.Create(() => {
                    const parentScope = this.scopeCache.get(parent);
                    const parentValue = ObservableScope.Value(parentScope);
                    const parentJson = parentValue.toJSON();
                    const currentValue = parentJson[prop];
                    return this.GetValueProxy(currentValue);
                });
                this.scopeCache.set(value, scope);
            }
            return scope;
        }
    }

    private GetValueProxy(value: any) {
        let proxy = this.proxyCache.get(value);
        if(!proxy) {
            proxy = this.CreateProxy(value);
            this.proxyCache.set(value, proxy);
        }

        return proxy;
    }

    private ObjectProxyGetter = (value: any, prop: string | symbol) => {
        function toJSON() {
            return value;
        };

        switch(prop) {
            case "toJSON":
                return toJSON;
            default:
                if(typeof prop === 'symbol')
                    return value[prop as any];

                return ObservableScope.Value(this.GetPropertyScope(value, prop));
        }
    }

    private CreateObjectProxy(value: any) {
        return new Proxy(value, {
            get: this.ObjectProxyGetter
        });
    }

    private ArrayProxyGetter = (value: any[], prop: any) => {
        function toJSON() {
            return value;
        };

        switch(prop) {
            case "toJSON":
                return toJSON;
            default:
                if(typeof prop === 'symbol')
                    return value[prop as any];

                if(isNaN(parseInt(prop))) {
                    const ret = value[prop];
                    if(typeof ret === 'function') {
                        const copy = value.map((val, index) => ObservableScope.Value(this.GetPropertyScope(value, index.toString())));
                        return ret.bind(copy);
                    }

                    return ret;
                }
                
                return ObservableScope.Value(this.GetPropertyScope(value, prop));
        }
    }
    
    private CreateArrayProxy(value: any[]) {
        return new Proxy(value, {
            get: this.ArrayProxyGetter
        });
    }
    
    private CreateProxy(value: any) {
        const type = TypeOf(value);
        switch(type) {
            case Type.Object:
                return this.CreateObjectProxy(value);
            case Type.Array:
                return this.CreateArrayProxy(value);
            default:
                return value;
        }
    }

    private WritePath(path: string, value: any) {
        this.UpdatePathCache(path, value);

        const pathParts = path.split(".");
        if(pathParts.length === 1) {
            const currentValue = this.rootStateMap.get(pathParts[0]);
            this.rootStateMap.set(pathParts[0], value);
            return currentValue === undefined ? this.undefinedScope : this.scopeCache.get(currentValue);
        }
        
        let parentValue: any;
        let x=0;
        for(; x<pathParts.length - 1 && (x === 0 || parentValue); x++) {
            if(x === 0)
                parentValue = this.rootStateMap.get(pathParts[x]);
            else
                parentValue = parentValue && parentValue[pathParts[x]];
        }

        if(!parentValue)
            throw new Error("Unable to write path: " + path + ". Falsey value found at: " + pathParts.slice(0, x).join("."));

        const prop = pathParts[x];
        parentValue[prop] = value;

        const leafScopes = this.leafScopeCache.get(parentValue);
        return leafScopes && leafScopes[prop] || this.scopeCache.get(parentValue);
    }

    private UpdatePathCache(path: string, value: any) {
        const type = TypeOf(value);
        if(type === Type.Value)
            return;

        this.pathCache.set(value, path);
        const keys = Object.keys(value);
        for(let x=0; x<keys.length; x++)
            this.UpdatePathCache(`${path}.${keys[x]}`, value[keys[x]]);

        return value;
    }

}