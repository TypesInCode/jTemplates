import Emitter from "../emitter";

function IsValue(value: any) {
    if(!value)
        return true;
    
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
}

var globalEmitter = new Emitter();

class ObjectStoreEmitter extends Emitter {
    constructor(public ___path: string) {
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

class StoreValue<T> extends Value<T> {

    constructor(private store: ObjectStore<any>, private valuePath: string) {
        super();
    }

    protected getValue(): T {
        var emitter = this.store.GetEmitter(this.valuePath);
        globalEmitter.emit("get", emitter);
        return this.store.GetValue(this.valuePath);
    }

    protected setValue(val: T): void {
        this.store.SetValue(this.valuePath, val);
        this.store.GetEmitter(this.valuePath).emit("set");
    }

}

class LoneValue<T> extends Value<T> {
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

export class ObjectStore<T> {
    private getIdCallback: { (val: any): any };
    private emitterMap: Map<string, ObjectStoreEmitter>;
    private getterMap: Map<string, any>;
    private idToPathsMap: Map<any, Set<string>>;
    private root: T;

    public get Root(): T {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
        /* var ret = this.CreateGetterObject(this.root, "root");
        return ret; */
    }

    public set Root(val: T) {
        this.Write(null, () => val);
    }

    constructor(idCallback?: { (val: any): any }) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new ObjectStoreEmitter("root"));
        this.getterMap = new Map();
        this.idToPathsMap = new Map();
    }

    public Get<T>(id: string): T {
        var paths = this.idToPathsMap.get(id);
        if(!paths)
            return null;

        var path = paths.values().next().value;
        var value = this.ResolvePropertyPath(path);
        return this.CreateGetterObject(value, path);
    }

    public GetEmitter(path: string): ObjectStoreEmitter {
        return this.emitterMap.get(path);
    }

    public GetValue(path: string): any {
        var value = this.ResolvePropertyPath(path);

        if(!IsValue(value))
            throw `Store path: ${path} does not resolve to a value type`;

        return value;
    }

    public SetValue(path: string, value: any) {
        if(!IsValue(value))
            throw `Can only set value types by path`;
        
        this.WriteTo(path, path, value);
    }

    public Value<O>(valueFunction: { (): O }): Value<O> {
        var emitters = ObjectStore.Watch(() => valueFunction()) as Array<ObjectStoreEmitter>;
        var emitter = emitters[emitters.length - 1];

        if(emitter && emitter === this.emitterMap.get(emitter.___path))
            return new StoreValue<O>(this, emitter.___path);

        throw `Invalid value expression. ${emitter ? 'Found emitter does not belong to this store.' : 'No emitters found.'}`;
    }

    public Write<O>(readOnly: O | string, updateCallback?: { (current: O): O } | { (current: O): void }): void {
        if(typeof readOnly === 'string')
            readOnly = this.Get(readOnly);
        
        var path = readOnly ? (readOnly as any).___path : "root";
        var localValue = this.ResolvePropertyPath(path) as O;
        var mutableCopy = this.CreateCopy(localValue);

        var newValue = updateCallback(mutableCopy);
        this.WriteTo(path, path, typeof newValue !== "undefined" ? newValue : mutableCopy);;
        /* this.writingRoot = path === "root";
        this.WriteToPath(typeof newValue !== "undefined" ? newValue : mutableCopy, localValue, path);
        this.writingRoot = false; */
    }

    private WriteTo(rootPath: string, path: string, value: any, skipDependents?: boolean) {
        var localValue = this.ResolvePropertyPath(path);
        if(localValue === value)
            return;

        this.AssignPropertyPath(value, path);
        this.ProcessChanges(rootPath, path, value, localValue, skipDependents);
    }

    private ProcessChanges(rootPath: string, path: string, value: any, oldValue: any, skipDependents?: boolean) {
        this.emitterMap.delete(path);
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
                
                this.WriteTo(rootPath, p, value, true);
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

        // this.RemoveEmitters(oldValue, skipProperties, path);
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
            ret = new Object() as { [key: string]: any };
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
                var val = this.ResolvePropertyPath(path);

                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                return ret || this.CreateGetterObject(val, path);
            },
            /* set: (val: any) => {
                this.WriteTo(path, path, val);
            } */
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
            emitter = new ObjectStoreEmitter(path);
            this.emitterMap.set(path, emitter);
        }
        emitter.emit("set");
    }

    private EmitGet(path: string) {
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new ObjectStoreEmitter(path);
            this.emitterMap.set(path, emitter);
        }

        globalEmitter.emit("get", emitter);
    }
}

export namespace ObjectStore {
    export function Create<T>(value: T, idCallback?: { (val: any): any }): ObjectStore<T> {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        var store = new ObjectStore<T>(idCallback);
        store.Root = value;
        return store;
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

    export function Value<O>(val: O): Value<O> {
        if(!IsValue(val))
            "Parameter is not a valid value type";

        return new LoneValue<O>(val);
    }
}