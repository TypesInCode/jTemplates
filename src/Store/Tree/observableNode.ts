import { JsonDiff, JsonType } from "../../Utils/json";
import { IObservableScope, ObservableScope } from "./observableScope";

const proxyCache = new WeakMap<any, IObservableNode<unknown | unknown[]>>();
const scopeCache = new WeakMap<any, IObservableScope<unknown | unknown[]>>();

function getOwnPropertyDescriptor(target: any, prop: string | symbol) {
    const descriptor = Object.getOwnPropertyDescriptor(target, prop);
    return {
        ...descriptor,
        configurable: true
    } as PropertyDescriptor;
}

function getOwnPropertyDescriptorArray(target: any, prop: string | symbol) {
    const descriptor = Object.getOwnPropertyDescriptor(target, prop);
    return {
        ...descriptor,
        configurable: true
    } as PropertyDescriptor;
}

function has(value: any, prop: string | symbol) {
    return Object.hasOwn(value, prop);
}

function hasArray(value: any, prop: string | symbol) {
    return Object.hasOwn(value, prop);
}

function ownKeys(value: any) {
    return Object.keys(value);
}

function ownKeysArray(value: any) {
    return Object.keys(value);
}

function UnwrapProxy(value: any) {
    if(!value)  
        return value;

    if(value.toJSON && typeof value.toJSON === 'function')
        return value.toJSON();

    const type = JsonType(value);
    switch(type) {
        case 'object': {
            const keys = Object.keys(value);
            for(let x=0; x<keys.length; x++)
                value[keys[x]] = UnwrapProxy(value[keys[x]])
        }
        case 'array': {
            for(let x=0; x<value.length; x++)
                value[x] = UnwrapProxy(value[x]);
        }
    }

    return value;
}

function CreateArrayProxy(value: any[]) {
    const scope = ObservableScope.Create(() => value);
    const proxy = new Proxy(value, {
        get: ArrayProxyGetter,
        set: ArrayProxySetter,
        has: hasArray,
        ownKeys: ownKeysArray,
        getOwnPropertyDescriptor: getOwnPropertyDescriptorArray
    }) as unknown as IObservableNode<unknown[]>;

    scopeCache.set(value, scope);
    proxyCache.set(value, proxy);
    
    return proxy;
}

function CreateObjectProxy(value: any) {
    const scope = ObservableScope.Create(() => value);
    const proxy = new Proxy(value, {
        get: ObjectProxyGetter,
        set: ObjectProxySetter,
        has,
        ownKeys,
        getOwnPropertyDescriptor
    }) as unknown as IObservableNode<unknown>;

    scopeCache.set(value, scope);
    proxyCache.set(value, proxy);

    return proxy;
}

function ArrayProxySetter(array: unknown[], prop: string, value: any) {
    value = UnwrapProxy(value);
    array[prop as any] = value;

    const scope = scopeCache.get(array);
    ObservableScope.Update(scope);
    return true;
}

function ArrayProxyGetter(array: unknown[], prop: string | symbol | number) {
    const scope = scopeCache.get(array) as IObservableScope<unknown[]>;
    array = ObservableScope.Value<unknown[]>(scope);
    switch(prop) {
        case "toJSON":
            return function () {
                return array;
            }
        default: {
            const arrayValue = (array as any)[prop];

            if(typeof prop === 'symbol')
                return arrayValue;

            if(typeof arrayValue === 'function')
                return function ArrayFunction(...args: any[]) {
                    let result = (array as any)[prop as any](...args);
                    switch(prop) {
                        case 'push':
                        case 'pop':
                        case 'shift':
                        case 'unshift':
                        case 'splice':
                        case 'sort':
                        case 'reverse': {
                            ObservableScope.Update(scope);
                            break;
                        }
                    }
            
                    return result;
                };

            const proxy = CreateProxy<any[]>(arrayValue);
            return proxy;
        }
    }
}

let applyingDiff = false;
function ObjectProxySetter(object: any, prop: string, value: any) {
    const scope = scopeCache.get(object) as IObservableScope<unknown>;
    const proxy = proxyCache.get(object) as any;
    value = UnwrapProxy(value);
    if(!applyingDiff) {
        applyingDiff = true;
        const json = proxy.toJSON() as any;
        const diff = JsonDiff(value, json[prop]);
        if(diff.length === 0 || (diff.length === 1 && diff[0].path.length === 0)) {
            object[prop] = value;
            ObservableScope.Update(scope);
        }
        else {
            for(let x=0; x<diff.length; x++) {
                const path = diff[x].path;
                let curr = proxy[prop];
                let y=0;
                for(; y<path.length - 1; y++)
                    curr = curr[path[y]];

                curr[path[y]] = diff[x].value;
            }
        }
        applyingDiff = false;
    }
    else {
        object[prop] = value;
        ObservableScope.Update(scope);
    }

    return true;
}

function ObjectProxyGetter(object: unknown, prop: string | symbol) {
    const scope = scopeCache.get(object);
    object = ObservableScope.Value<unknown>(scope);
    switch(prop) {
        case "toJSON":
            return function() {
                return object;
            }
        default: {
            const data = ObservableScope.Value(scope) as any;
            const proxyValue = data[prop];

            if(typeof prop === 'symbol')
                return proxyValue;

            const proxy = CreateProxy(proxyValue);
            return proxy;
        }
    }
}

export type IObservableNode<T> = T extends string | number | boolean ? T : {
    [P in keyof T]: IObservableNode<T[P]>
} & { toJSON: () => T };

export function CreateProxy<T>(value: T): IObservableNode<T> { 
    const type = JsonType(value);
    switch(type) {
        case 'object': {
            const proxy = proxyCache.get(value) ?? CreateObjectProxy(value);
            return proxy as IObservableNode<T>;
        }
        case 'array': {
            const proxy = proxyCache.get(value) ?? CreateArrayProxy(value as any[]);
            ObservableScope.Touch(scopeCache.get(value));
            return proxy as IObservableNode<T>;
        }
        default:
            return value as any;
    }
}