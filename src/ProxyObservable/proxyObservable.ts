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

export abstract class Value<T> {
    public get Value(): T {
        return this.getValue();
    }

    public set Value(val: T) {
        this.setValue(val);
    }

    constructor() { }

    protected abstract getValue(): T;

    protected abstract setValue(val: T): void;

    toString() {
        var val = this.Value;
        return val && val.toString();
    }

    valueOf() {
        var val = this.Value;
        return val && val.valueOf();
    }
}

class DynamicValue<T> extends Value<T> {

    constructor(private valuePath: string) {
        super();
    }

    protected getValue(): T {
        var emitter = emitterMap.get(this.valuePath);
        globalEmitter.emit("get", emitter);
        return valueMap.get(this.valuePath);
    }

    protected setValue(val: T): void {
        valueMap.set(this.valuePath, val);
        emitterMap.get(this.valuePath).emit("set");
    }

}

class StaticValue<T> extends Value<T> {
    private emitter = new Emitter();

    constructor(private value: T) {
        super();
    }

    protected getValue() {
        globalEmitter.emit("get", this.emitter);
        return this.value;
    }

    protected setValue(val: T) {
        this.value = val;
        this.emitter.emit("set");
    }
}

export namespace Value {
    export function Create<T>(valueFunction: { (): T }): Value<T> {
        var emitters = ProxyObservable.Watch(valueFunction) as Array<ProxyObservableEmitter>;
        var emitter = emitters[emitters.length - 1];
        return new DynamicValue<T>(emitter.emitterPath);
    }

    export function Static<T>(value: T): Value<T> {
        return new StaticValue<T>(value);
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

    var disableGetEvent = false;
    function CreateProxy(parentPath: string, initValue: any) {
        var proxy = new Proxy(initValue, {
            get: function(obj: any, prop: string) {
                if(disableGetEvent || typeof prop !== 'string')
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
                    obj[prop] = FromObject(val, propPath, obj[prop]);
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

    function FromObject(value: any, proxyPath: string, proxy?: any) {
        var proxy = !IsValue(proxy) ? proxy : CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        
        if(Array.isArray(value)) {
            var lengthPath = `${proxyPath}.length`
            emitterMap.set(lengthPath, emitterMap.get(lengthPath) || new ProxyObservableEmitter(lengthPath));

            if(proxy.length > value.length)
                proxy.splice(value.length);
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

    function DestroyRecursive(parent: any, path: string) {
        if(!parent || typeof parent !== 'object')
            return;
        
        for(var key in parent) {
            var childPath = `${path}.${key}`;
            emitterMap.delete(childPath);
            valueMap.delete(childPath);
            DestroyRecursive(parent[key], childPath);
        }
    }

    var destroyTimeout: any;
    var destroyQueue: Array<ProxyObservable> = [];
    function ProcessDestroyQueue() {
        for(var x=0; x<destroyQueue.length; x++) {
            var obj = destroyQueue[x];
            var id = rootObjectMap.get(obj);
            // id = `${id}.`;
            if(!id)
                throw "Key not found in rootObjectMap";

            rootObjectMap.delete(obj);       
            disableGetEvent = true;     
            DestroyRecursive(obj, id);
            disableGetEvent = false;
            /* var keys = [];
            var keyIterator = emitterMap.keys();
            var current: IteratorResult<string> = null;
            while((current = keyIterator.next()) && !current.done)
                if(current.value.startsWith(id))
                    keys.push(current.value);

            keys.forEach(key => emitterMap.delete(key));
            keys = [];

            keyIterator = valueMap.keys();
            current = null;
            while((current = keyIterator.next()) && !current.done)
                if(current.value.startsWith(id))
                    keys.push(current.value);
            
            keys.forEach(key => valueMap.delete(key)); */
        }
        destroyQueue = [];
    }

    export function Destroy(obj: ProxyObservable) {
        destroyQueue.push(obj);
        clearTimeout(destroyTimeout);
        destroyTimeout = setTimeout(ProcessDestroyQueue, 500);
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