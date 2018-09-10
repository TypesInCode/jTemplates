import { EventEmitter } from "events";

export namespace ProxyObservable {
    var globalEmitter = new EventEmitter();
    var rootProxyId = 0;
    var proxyMap: { [proxyId: string]: EventEmitter } = {};

    function IsValue(value: any) {
        if(!value)
            true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    function CreateProxy(proxyPath: string, initValue: any) {
        return new Proxy(initValue, {
            get: function(obj: any, prop: string) {
                if(typeof prop !== 'string')
                    return obj[prop];

                var proxyId = `${proxyPath}.${prop}`;
                var emitter = proxyMap[proxyId];
                emitter && globalEmitter.emit("get", emitter);
                return obj[prop];
            },
            set: function(obj: any, prop: string, val: any) {
                if(typeof prop !== 'string') {
                    obj[prop] = val;
                    return true;
                }

                var propPath = `${proxyPath}.${prop}`;

                proxyMap[propPath] = proxyMap[propPath] || new EventEmitter();
                if(IsValue(val))
                    obj[prop] = val;
                else
                    obj[prop] = FromObject(val, propPath);

                proxyMap[propPath].emit("set");
                
                return true;
            }
        });
    }

    function FromObject(value: any, proxyPath: string) {
        var proxy = CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        
        if(Array.isArray(value)) {
            proxyMap[`${proxyPath}.length`] = proxyMap[`${proxyPath}.length`] || new EventEmitter();
        }
            
        for(var key in value)
            proxy[key] = value[key];
        
        return proxy;
    }

    export function Create<T>(value: T): T {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";
        
        // return CreateRecursive(value, (++rootProxyId).toString());
        /* var proxy = CreateProxy((++rootProxyId).toString(), Array.isArray(value) ? [] : {});

        for(var key in value)
            proxy[key] = value[key]; */

        return FromObject(value, (++rootProxyId).toString());
    }

    export function Watch(callback: {(): void}): Array<EventEmitter> {
        var emitters = new Set();
        globalEmitter.addListener("get", (emitter: EventEmitter) => {
            if(!emitters.has(emitter))
                emitters.add(emitter);
        });

        callback();

        globalEmitter.removeAllListeners();
        return [...emitters];
    }
}