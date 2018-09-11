import { Emitter } from "../emitter";

export namespace ProxyObservable {
    var globalEmitter = new Emitter();
    var rootProxyId = 0;
    var emitterMap: { [proxyId: string]: Emitter } = {};
    var valueMap: { [proxyId: string]: any } = {};

    export class Value {
        public get __value() {
            var value = this.__parent[this.__prop] as Value;
            return value && value.__getRealValue();
        }

        public set __value(val: any) {
            this.__parent[this.__prop] = val;
        }
    
        constructor(private __parent: any, private __path: string, private __prop: string) { }
    
        __getRealValue() {
            return valueMap[`${this.__path}.${this.__prop}`];
        }
    
        toString() {
            return this.__value && this.__value.toString();
        }
    
        valueOf() {
            return this.__value && this.__value.valueOf();
        }
    }

    export namespace Value {
        export function Assign<T>(target: Value | any, value: T): T {
            if(target instanceof Value) {
                target.__value = value;
                return target as any as T;
            }

            return value;
        }
    }

    function IsValue(value: any) {
        if(!value)
            return true;
        
        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
    }

    function GetValue(value: any) {
        if(value && value.__getRealValue)
            return value.__getRealValue();

        return value;
    }

    function WrapValue(parent: any, path: string, prop: string, value: any) {
        valueMap[`${path}.${prop}`] = value;
        if(typeof value === 'function') {
            var func = function () {
                var value = parent[prop];
                if(!value)
                    return;
                
                var func = value.__getRealValue();
                func.apply(this, arguments);
            } as any;

            func.__getRealValue = function(): any {
                return valueMap[`${path}.${prop}`];
            }

            return func;
        }
        else {
            return new Value(parent, path, prop);
        }
    }

    function CreateProxy(proxyPath: string, initValue: any) {
        var proxy = new Proxy(initValue, {
            get: function(obj: any, prop: string) {
                if(typeof prop !== 'string')
                    return obj[prop];

                var proxyId = `${proxyPath}.${prop}`;
                var emitter = emitterMap[proxyId];
                emitter && globalEmitter.emit("get", emitter);
                return obj[prop];
            },
            set: function(obj: any, prop: string, val: any) {
                var isArray = Array.isArray(obj);
                if(typeof prop !== 'string') {
                    obj[prop] = val;
                    return true;
                }

                var propPath = `${proxyPath}.${prop}`;
                emitterMap[propPath] = emitterMap[propPath] || new Emitter();

                if(obj[prop] === val && !(isArray && prop === 'length'))
                    return true;
                
                if(IsValue(val) && !(isArray && prop === 'length'))
                    obj[prop] = WrapValue(proxy, proxyPath, prop, GetValue(val));
                else if(isArray && prop === 'length')
                    obj[prop] = val;
                else
                    obj[prop] = FromObject(val, propPath);

                emitterMap[propPath].emit("set");
                if(isArray && prop === 'length')
                    emitterMap[proxyPath].emit("set");
                
                return true;
            }
        });

        return proxy;
    }

    function FromObject(value: any, proxyPath: string) {
        var proxy = CreateProxy(proxyPath, Array.isArray(value) ? [] : {});
        
        if(Array.isArray(value)) {
            emitterMap[`${proxyPath}.length`] = emitterMap[`${proxyPath}.length`] || new Emitter();
        }
            
        for(var key in value)
            proxy[key] = value[key];
        
        return proxy;
    }

    export function Create<T>(value: T): T {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        return FromObject(value, (++rootProxyId).toString());
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