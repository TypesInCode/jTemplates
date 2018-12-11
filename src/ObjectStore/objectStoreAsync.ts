import Emitter from "../emitter";
import { globalEmitter } from './globalEmitter';
import { Scope } from "./objectStoreScope";
import { ObjectStoreWorker } from "./objectStoreWorker";
import { WorkerQueue } from "./workerQueue";
import { ObjectDiff } from "./objectDiff";

function IsValue(value: any) {
    if(!value)
        return true;
    
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor))
}

export class StoreAsync<T> {
    private getIdCallback: { (val: any): any };
    private emitterMap: Map<string, Emitter>;
    private getterMap: Map<string, any>;
    private idToPathsMap: Map<any, Set<string>>;
    private root: T;
    private workerQueue: WorkerQueue<IMessage, IPostMessage>;

    public get Root(): T {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }

    public set Root(val: T) {
        this.WriteTo("root", val);
    }

    constructor(idCallback?: { (val: any): any }) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new Emitter());
        this.getterMap = new Map();
        this.idToPathsMap = new Map();
        this.workerQueue = new WorkerQueue(ObjectStoreWorker.Create);
    }

    public Scope<O>(valueFunction: {(root: T): O}, setFunction?: {(val: T, next: O): void}): Scope<O> {
        return new Scope(() => valueFunction(this.Root), (next: O) => setFunction(this.Root, next));
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

    public Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O): Promise<any> {
        if(typeof readOnly === 'string')
            readOnly = this.Get(readOnly);
        
        var path = readOnly ? (readOnly as any).___path : "root";

        return this.WriteToAsync(path, updateCallback);
    }

    public Push<O>(readOnly: Array<O>, newValue: O): void {
        var path = (readOnly as any).___path;
        
        var localValue = this.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, localValue.length].join(".");
        localValue.push(null);

        var getterValue = this.getterMap.get(path) as Array<O>;
        getterValue.push(this.CreateGetterObject(newValue, childPath));

        this.WriteTo(childPath, newValue)
        this.EmitSet(path);
    }

    private WriteTo(path: string, value: any, skipDependents?: boolean) {
        var localValue = this.ResolvePropertyPath(path);
        this.AssignPropertyPath(value, path);
        var resp = ObjectDiff(path, value, localValue, this.getIdCallback);
        this.CleanMaps(resp, skipDependents);
    }

    private WriteToAsync(path: string, updateCallback: {(): any} | any, skipDependents?: boolean): Promise<void> {
        return new Promise((resolve) => {
            var value: any = null;
            this.workerQueue.Push(() => {
                if(typeof updateCallback === 'function') {
                    var localValue = this.ResolvePropertyPath(path);
                    var mutableCopy = this.CreateCopy(localValue);
                    var ret = (updateCallback as any)(mutableCopy);
                    value = typeof ret === 'undefined' ? mutableCopy : ret;
                }
                else
                    value = updateCallback;
                    
                return {
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(path),
                    path: path,
                    idFunction: this.getIdCallback && this.getIdCallback.toString()
                };
            }, (postMessage) => {
                this.AssignPropertyPath(value, path);
                this.CleanMaps(postMessage.data, skipDependents);
                resolve();
            });
        });
    }

    private CleanMaps(data: IPostMessage, skipDependents: boolean) {
        data.changedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.EmitSet(p);
        });

        data.deletedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.emitterMap.delete(p);
        });

        data.processedIds.forEach(idObj => {
            var oldId = idObj.oldId;
            var newId = idObj.newId;
            var path = idObj.path;
            if(oldId && oldId !== newId) {
                var oldIdPaths = this.idToPathsMap.get(oldId);
                if(oldIdPaths) {
                    oldIdPaths.delete(idObj.path);
                    if(oldIdPaths.size === 0)
                        this.idToPathsMap.delete(idObj.oldId);
                }
            }

            if(!skipDependents && newId) {
                var value = this.ResolvePropertyPath(idObj.path);
                var dependentPaths = this.idToPathsMap.get(newId);
                if(!dependentPaths) {
                    dependentPaths = new Set([path]);
                    this.idToPathsMap.set(newId, dependentPaths);
                }
                else if(!dependentPaths.has(path))
                    dependentPaths.add(path);
    
                dependentPaths.forEach(p => {
                    if(p === path || p.indexOf(data.rootPath) === 0)
                        return;
                    
                    this.WriteToAsync(p, value, true);
                });
            }
        });
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
                this.WriteToAsync(path, val);
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
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }
        emitter.emit("set");
    }

    private EmitGet(path: string) {        
        var emitter = this.emitterMap.get(path);
        if(!emitter) {
            emitter = new Emitter();
            this.emitterMap.set(path, emitter);
        }

        globalEmitter.Register(emitter);
    }
}

export namespace StoreAsync {
    export function Create<T>(value: T, idCallback?: { (val: any): any }): StoreAsync<T> {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        var store = new StoreAsync<T>(idCallback);
        store.Root = value;
        return store;
    }
}