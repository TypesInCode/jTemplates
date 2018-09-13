import { Emitter } from "../emitter";

var globalEmitter = new Emitter();
var rootProxyId = 0;
var emitterMap: Map<string, Emitter> = new Map(); //{ [proxyId: string]: Emitter } = {};
var valueMap: Map<string, any> = new Map(); //{ [proxyId: string]: any } = {};
var rootObjectMap: Map<any, string> = new Map();

class ProxyObservableEmitter extends Emitter {
    constructor(public emitterPath: string) {
        super();
    }
}

export class Value<T> {
    public get Value(): T {
        var emitter = emitterMap.get(this.valuePath);
        globalEmitter.emit("get", emitter);
        return valueMap.get(this.valuePath);
    }

    public set Value(val: T) {
        valueMap.set(this.valuePath, val);
        emitterMap.get(this.valuePath).emit("set");
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

                var propPath = `${parentPath}.${prop}`;
                var emitter = emitterMap.get(propPath);
                emitter && globalEmitter.emit("get", emitter);
                if(valueMap.get(propPath) === undefined)
                    return obj[prop];

                return valueMap.get(propPath);
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
                emitterMap.set(propPath, emitterMap.get(propPath) || new ProxyObservableEmitter(propPath)); // new Emitter();

                if(valueMap.get(propPath) === val && !(isArray && prop === 'length'))
                    return true;
                
                if(IsValue(val)) {
                    /* if(typeof val === 'function')
                        valueMap[propPath] = obj[prop] = WrapFunction(propPath, val);
                    else */
                        valueMap.set(propPath, obj[prop] = val);
                }
                else {
                    valueMap.delete(propPath);
                    obj[prop] = FromObject(val, propPath);
                }

                emitterMap.get(propPath).emit("set");

                if(isArray && arrayLength != obj.length && prop != 'length') {
                    emitterMap.get(`${parentPath}.length`).emit('set');
                    emitterMap.get(parentPath) && emitterMap.get(parentPath).emit('set');
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
            emitterMap.set(lengthPath, emitterMap.get(lengthPath) || new ProxyObservableEmitter(lengthPath));
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
        for(var key in emitterMap.keys)
            if(key.startsWith(id))
                keys.push(key);

        keys.forEach(key => emitterMap.delete(key));
        keys = [];

        for(var key in valueMap.keys)
            if(key.startsWith(id))
                keys.push(key);
        
        keys.forEach(key => valueMap.delete(key));
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