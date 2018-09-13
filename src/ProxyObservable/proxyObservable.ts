import { Emitter } from "../emitter";

var globalEmitter = new Emitter();
var rootProxyId = 0;
var emitterMap: { [proxyId: string]: Emitter } = {};
var valueMap: { [proxyId: string]: any } = {};
var rootObjectMap: Map<any, string> = new Map();

class ProxyObservableEmitter extends Emitter {
    constructor(public emitterPath: string) {
        super();
    }
}

export class Value<T> {
    public get Value(): T {
        var emitter = emitterMap[this.valuePath];
        globalEmitter.emit("get", emitter);
        return valueMap[this.valuePath];
    }

    public set Value(val: T) {
        valueMap[this.valuePath] = val;
        emitterMap[this.valuePath].emit("set");
    }

    constructor(private valuePath: string) { }

    toString() {
        var val = this.Value;
        return val && val.toString();
    }

    valueOf() {
        var val = this.Value;
        return val && val.valueOf();
    }
}

export namespace Value {
    export function Create<T>(valueFunction: { (): T }): Value<T> {
        var emitters = ProxyObservable.Watch(valueFunction) as Array<ProxyObservableEmitter>;
        var emitter = emitters[emitters.length - 1];
        return new Value<T>(emitter.emitterPath);
    }
}

export namespace ProxyObservable {

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    /* function WrapFunction(valuePath: string, func: { (): any }) {
        return function() {
            var emitter = emitterMap[valuePath];
            globalEmitter.emit("get", emitter);
            func.apply(this, arguments);
        }
    } */

    function CreateProxy(parentPath: string, initValue: any) {
        var proxy = new Proxy(initValue, {
            get: function(obj: any, prop: string) {
                if(typeof prop !== 'string')
                    return obj[prop];

                var proxyId = `${parentPath}.${prop}`;
                var emitter = emitterMap[proxyId];
                emitter && globalEmitter.emit("get", emitter);
                return valueMap[proxyId] || obj[prop];
            },
            set: function(obj: any, prop: string, val: any) {
                if(typeof prop !== 'string') {
                    obj[prop] = val;
                    return true;
                }

                var isArray = Array.isArray(obj);
                var arrayLength = null;
                if(isArray)
                    arrayLength = obj.length;

                var propPath = `${parentPath}.${prop}`;
                emitterMap[propPath] = emitterMap[propPath] || new ProxyObservableEmitter(propPath); // new Emitter();

                if(obj[prop] === val && !(isArray && prop === 'length'))
                    return true;
                
                if(IsValue(val)) {
                    /* if(typeof val === 'function')
                        valueMap[propPath] = obj[prop] = WrapFunction(propPath, val);
                    else */
                        valueMap[propPath] = obj[prop] = val;
                }
                else {
                    delete valueMap[propPath];
                    obj[prop] = FromObject(val, propPath);
                }

                emitterMap[propPath].emit("set");

                if(isArray && arrayLength != obj.length && prop != 'length') {
                    emitterMap[`${parentPath}.length`].emit('set');
                    emitterMap[parentPath] && emitterMap[parentPath].emit('set');
                }
                
                return true;
            }
        });

        return proxy;
    }

    function FromObject(value: any, proxyPath: string) {
        var proxy = CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        
        if(Array.isArray(value)) {
            var lengthPath = `${proxyPath}.length`
            emitterMap[lengthPath] = emitterMap[lengthPath] || new ProxyObservableEmitter(lengthPath);
        }
            
        for(var key in value)
            proxy[key] = value[key];
        
        return proxy;
    }

    interface ProxyObservable { 
        __ProxyObservableInterfaceProperty: boolean;
    }
    
    export function Create<T>(value: T): T & ProxyObservable {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        var id = (++rootProxyId).toString();
        var obj = FromObject(value, id);
        rootObjectMap.set(obj, id);
        return obj;
    }

    export function Destroy(obj: ProxyObservable) {
        var id = rootObjectMap.get(obj);
        if(!id)
            throw "Key not found in rootObjectMap";

        rootObjectMap.delete(obj);
        var keys = [];
        for(var key in emitterMap)
            if(key.startsWith(id))
                keys.push(key);

        keys.forEach(key => delete emitterMap[key]);
        keys = [];

        for(var key in valueMap)
            if(key.startsWith(id))
                keys.push(key);
        
        keys.forEach(key => delete valueMap[key]);
    }

    export function Watch(callback: {(): void}): Array<Emitter> {
        var emitters = new Set();
        globalEmitter.addListener("get", (emitter: Emitter) => {
            if(!emitters.has(emitter))
                emitters.add(emitter);
        });

        callback();

        globalEmitter.removeAllListeners();
        return [...emitters];
    }
}