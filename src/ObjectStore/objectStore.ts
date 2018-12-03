import Emitter from "../emitter";
import { globalEmitter } from './globalEmitter';
import { Scope } from "./objectStoreScope";

function IsValue(value: any) {
    if(!value)
        return true;
    
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
}

export class Store<T> {
    private getIdCallback: { (val: any): any };
    private emitterMap: Map<string, Emitter>;
    private getterMap: Map<string, any>;
    private idToPathsMap: Map<any, Set<string>>;
    private root: T;

    public get Root(): T {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }

    public set Root(val: T) {
        this.Write(null, () => val);
    }

    constructor(idCallback?: { (val: any): any }) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new Emitter());
        this.getterMap = new Map();
        this.idToPathsMap = new Map();
    }

    public Scope<O>(valueFunction: {(root: T): O}): Scope<O> {
        return new Scope(() => valueFunction(this.Root));
    }

    public Get<O>(id: string): O {
        var paths = this.idToPathsMap.get(id);
        if(!paths)
            return null;

        var path = paths.values().next().value;
        this.EmitGet(path);
        var ret = this.getterMap.get(path);
        return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
    }

    public Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O): void {
        if(typeof readOnly === 'string') {
            readOnly = this.Get(readOnly);
            if(!readOnly)
                return;
        }
        
        var path = readOnly ? (readOnly as any).___path : "root";
        var localValue = this.ResolvePropertyPath(path) as O;

        var newValue = null;
        var mutableCopy = null;
        if(typeof updateCallback === 'function') {
            mutableCopy = this.CreateCopy(localValue);
            newValue = (updateCallback as { (current: O): O })(mutableCopy);
        }
        else 
            newValue = updateCallback;

        this.WriteTo(path, typeof newValue !== "undefined" ? newValue : mutableCopy);
    }

    public Push<O>(readOnly: Array<O>, newValue: O) {
        var path = (readOnly as any).___path;
        
        var localValue = this.ResolvePropertyPath(path) as Array<O>;
        var oldLength = localValue.length;

        var childPath = [path, oldLength].join(".");
        localValue.push(null);
        this.WriteTo(childPath, newValue);

        var getterValue = this.getterMap.get(path) as Array<O>;
        getterValue.push(this.CreateGetterObject(newValue, childPath));

        this.EmitSet(path);
    }

    private WriteTo(path: string, value: any, skipDependents?: boolean) {
        var localValue = this.ResolvePropertyPath(path);
        if(localValue === value)
            return;

        this.AssignPropertyPath(value, path);
        this.ProcessChanges(path, path, value, localValue, skipDependents);
    }

    private ProcessChanges(rootPath: string, path: string, value: any, oldValue: any, skipDependents?: boolean) {
        this.getterMap.delete(path);
        var newId = value && this.getIdCallback && this.getIdCallback(value);
        var oldId = oldValue && this.getIdCallback && this.getIdCallback(oldValue);

        if(oldId && oldId !== newId) {
            var oldIdPaths = this.idToPathsMap.get(oldId);
            oldIdPaths.delete(path);
            if(oldIdPaths.size === 0)
                this.idToPathsMap.delete(oldId);
        }

        if(!skipDependents && newId) {
            var dependentPaths = this.idToPathsMap.get(newId);
            if(!dependentPaths) {
                dependentPaths = new Set([path]);
                this.idToPathsMap.set(newId, dependentPaths);
            }
            else if(!dependentPaths.has(path))
                dependentPaths.add(path);

            dependentPaths.forEach(p => {
                if(p === path || p.indexOf(rootPath) === 0)
                    return;
                
                this.WriteTo(p, value, true);
            });
        }

        var skipProperties = new Set();
        if(!IsValue(value)) {
            for(var key in value) {
                var childPath = [path, key].join(".");
                this.ProcessChanges(rootPath, childPath, value[key], oldValue && oldValue[key], skipDependents);
                skipProperties.add(key);
            }
        }

        this.CleanUp(oldValue, skipProperties, path);
        this.EmitSet(path);
    }

    private CleanUp(value: any, skipProperties: Set<string>, path: string) {
        if(!IsValue(value)) {
            for(var key in value) {
                if(!(skipProperties && skipProperties.has(key))) {
                    var childPath = [path, key].join(".");
                    this.emitterMap.delete(childPath);
                    this.getterMap.delete(childPath);
                    this.CleanUp(value[key], null, childPath);
                }
            }

            if(!skipProperties || skipProperties.size === 0) {
                var id = this.getIdCallback && this.getIdCallback(value);
                if(id) {
                    var paths = this.idToPathsMap.get(id);
                    if(paths) {
                        paths.delete(path);
                        if(paths.size === 0)
                            this.idToPathsMap.delete(id);
                    }
                }
            }
        }
    }

    private AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));

        (parentObj as any)[prop] = value;
    }

    private ResolvePropertyPath(path: string) {
        if(!path)
            return this;
        
        return path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this);
    }

    private CreateGetterObject(source: any, path: string) {
        if(IsValue(source))
            return source;
        
        var ret = null;
        if(Array.isArray(source)) {
            ret = new Array(source.length);
            for(var x=0; x<source.length; x++)
                ret[x] = this.CreateGetterObject(source[x], [path, x].join("."));
        }
        else {
            ret = Object.create(null) as { [key: string]: any };
            for(var key in source)
                this.CreateGetter(ret, path, key);
        }

        Object.defineProperty(ret, "___path", {
            value: path,
            configurable: false,
            enumerable: false,
            writable: false
        });

        this.getterMap.set(path, ret);
        return ret;
    }

    private CreateGetter(target: any, parentPath: string, property: string) {
        var path = [parentPath, property].join('.');
        Object.defineProperty(target, property, {
            enumerable: true,
            get: () => {
                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
            },
            set: (val: any) => {
                this.WriteTo(path, val);
            }
        });
    }

    private CreateCopy<O>(source: O): O {
        if(IsValue(source))
            return source;

        var ret = null;
        if(Array.isArray(source)) {
            ret = new Array(source.length);
            for(var x=0; x<source.length; x++)
                ret[x] = this.CreateCopy(source[x]);

            return ret as any as O;
        }

        ret = {} as { [key: string]: any };
        for(var key in source)
            ret[key] = this.CreateCopy(source[key]);

        return ret as any as O;
    }

    private EmitSet(path: string) {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            // emitter = new ObjectStoreEmitter(path, this);
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }
        emitter.emit("set");
    }

    private EmitGet(path: string) {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new Emitter();
            // emitter = new ObjectStoreEmitter(path, this);
            this.emitterMap.set(path, emitter);
        }

        // globalEmitter.emit("get", emitter);
        globalEmitter.Register(emitter);
    }
}

export namespace Store {
    export function Create<T>(value: T, idCallback?: { (val: any): any }): Store<T> {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        var store = new Store<T>(idCallback);
        store.Root = value;
        return store;
    }

    /* export function Watch(callback: {(): void}): Array<Emitter> {
        var emitters = new Set();
        globalEmitter.addListener("get", (emitter: Emitter) => {
            if(!emitters.has(emitter))
                emitters.add(emitter);
        });

        callback();

        globalEmitter.removeAllListeners();
        return [...emitters];
    } */

    /* export function Value<O>(valueFunction: { (): O }): Value<O> {
        var val: O = null;
        var emitters = ObjectStore.Watch(() => { val = valueFunction() }) as Array<ObjectStoreEmitter>;
        if(emitters.length > 0) {
            var emitter = emitters[emitters.length - 1];

            if(emitter instanceof ObjectStoreEmitter)
                return new StoreValue<O>(emitter.store, emitter.___path);
        }

        return new StaticValue(val);
   } */
}