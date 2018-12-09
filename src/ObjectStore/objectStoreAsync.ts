import Emitter from "../emitter";
import { globalEmitter } from './globalEmitter';
import { Scope } from "./objectStoreScope";
import { ObjectStoreWorker } from "./objectStoreWorker";
import { WorkerQueue } from "./workerQueue";

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
    // private getterRoot: T;
    private root: T;
    // private worker: Worker;
    private workerQueue: WorkerQueue<IMessage, IPostMessage>;

    public get Root(): T {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }

    public set Root(val: T) {
        // this.Write(null, () => val);
        this.WriteToSync("root", val);
    }

    constructor(idCallback?: { (val: any): any }) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new Emitter());
        //this.getterMap = new Map();
        this.idToPathsMap = new Map();
        // this.worker = null; //ObjectStoreWorker.Create();
        this.workerQueue = new WorkerQueue(ObjectStoreWorker.Create);
    }

    public Scope<O>(valueFunction: {(root: T): O}, setFunction?: {(val: T, next: O): void}): Scope<O> {
        return new Scope(() => valueFunction(this.Root), (next: O) => setFunction(this.Root, next));
    }

    /* public Get<O>(id: string): O {
        var paths = this.idToPathsMap.get(id);
        if(!paths)
            return null;

        var path = paths.values().next().value;
        this.EmitGet(path);
        var ret = this.getterMap.get(path);
        return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
    } */

    public Write<O>(readOnly: O, updateCallback: { (current: O): O } | { (current: O): void } | O): Promise<any> {
        /* if(typeof readOnly === 'string') {
            readOnly = this.Get(readOnly);
            if(!readOnly)
                return;
        } */
        
        var path = readOnly ? (readOnly as any).___path : "root";
        /* var localValue = this.ResolvePropertyPath(path) as O;

        var newValue = null;
        var mutableCopy = null;
        if(typeof updateCallback === 'function') {
            mutableCopy = this.CreateCopy(localValue);
            newValue = (updateCallback as { (current: O): O })(mutableCopy);
        }
        else 
            newValue = updateCallback; */

        return this.WriteToAsync(path, () => {
            if(typeof updateCallback === 'function') {
                var localValue = this.ResolvePropertyPath(path) as O;
                var mutableCopy = this.CreateCopy(localValue);
                var ret = (updateCallback as any)(mutableCopy);
                return typeof ret === 'undefined' ? mutableCopy : ret;
            }

            return updateCallback;
        });//typeof newValue !== "undefined" ? newValue : mutableCopy);
    }

    public Push<O>(readOnly: Array<O>, newValue: O): Promise<any> {
        var path = (readOnly as any).___path;
        
        var localValue = this.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, localValue.length].join(".");
        localValue.push(null);

        var getterValue = this.getterMap.get(path) as Array<O>;
        getterValue.push(this.CreateGetterObject(newValue, childPath));

        /* this.WriteToSync(childPath, newValue)
        this.EmitSet(path); */
        return new Promise((resolve, reject) => {
            this.WriteToAsync(childPath, () => newValue).then(() => {
                this.EmitSet(path);
                resolve();
            }, reject);
        });
    }

    private WriteToSync(path: string, value: any) {
        var localValue = this.ResolvePropertyPath(path);
        if(localValue === value)
            return;

        this.AssignPropertyPath(value, path);

        var resp = {
            wasNull: !localValue && localValue !== 0,
            skipDependents: false,
            changedPaths: null,
            deletedPaths: [],
            processedIds: [],
            rootPath: path
        } as IPostMessage;

        resp.changedPaths = this.ProcessChanges(path, value, localValue, this.getIdCallback, resp);
        this.CleanMaps(resp);
    }

    private WriteToAsync(path: string, valueCallback: {(): any}, skipDependents?: boolean): Promise<any> {
        /* var localValue = this.ResolvePropertyPath(path);
        if(localValue === value)
            return; */

        return new Promise((resolve, reject) => {
            var value: any = null;
            this.workerQueue.Push(() => {
                value = valueCallback();
                return {
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(path),
                    path: path,
                    idFunction: this.getIdCallback && this.getIdCallback.toString(),
                    skipDependents: !!skipDependents
                }
            }, (postMessage) => {
                this.AssignPropertyPath(value, path);
                this.CleanMaps(postMessage.data);
                resolve();
            });
        });

        /* this.worker && this.worker.terminate();
        this.worker = ObjectStoreWorker.Create();
        this.worker.onmessage = (event) => {
            // console.log(event);
            var data = event.data as IPostMessage;
            this.CleanMaps(data);
            this.worker.terminate();
            this.worker = null;
        };
        this.worker.postMessage({
            newValue: value,
            oldValue: localValue,
            path: path,
            idFunction: this.getIdCallback && this.getIdCallback.toString(),
            skipDependents: !!skipDependents
        } as IMessage) */
    }

    private ProcessChanges(path: string, value: any, oldValue: any, idFunction: {(val: any): any} | string, response: IPostMessage): Array<string> {
        // debugger;
        var localIdFunction = null as {(val: any): any};
        if(typeof idFunction === 'string')
            localIdFunction = eval(idFunction);
        else if(idFunction)
            localIdFunction = idFunction;

        var newIsValue = IsValue(value);
        var oldIsValue = IsValue(oldValue);

        var newId = value && localIdFunction && localIdFunction(value);
        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
        if(oldId || newId) {
            response.processedIds.push({
                newId: newId,
                oldId: oldId,
                path: path
            });
        }

        var skipProperties = new Set();
        var pathChanged = false;
        var childChanges = null;
        if(newIsValue)
            pathChanged = value !== oldValue;
        else {
            pathChanged = oldIsValue;
            if(!pathChanged) {
                for(var key in value) {
                    pathChanged = pathChanged || !(key in oldValue);
                    var childPath = [path, key].join(".");
                    childChanges = this.ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
                    skipProperties.add(key);
                }
            }
        }

        var deletedCount = response.deletedPaths.length;
        this.DeleteProperties(oldValue, skipProperties, path, response, localIdFunction);
        pathChanged = pathChanged || deletedCount !== response.deletedPaths.length;

        if(pathChanged && childChanges)
            return [path].concat(childChanges);
        else if(pathChanged)
            return [path];
        else if(childChanges)
            return childChanges;
        
        return [];
    }

    private DeleteProperties(value: any, skipProperties: Set<string>, path: string, response: IPostMessage, idFunction: {(val: any): any}) {
        if(IsValue(value))
            return;
        
        for(var key in value) {
            if(!skipProperties || !skipProperties.has(key)) {
                var childPath = [path, key].join(".");
                response.deletedPaths.push(childPath);
                this.DeleteProperties(value[key], null, childPath, response, idFunction);
            }
        }

        if(!skipProperties) {
            var id = idFunction && idFunction(value);
            if(id) {
                response.processedIds.push({
                    newId: null,
                    oldId: id,
                    path: path
                });
            }
        }
    }

    private CleanMaps(data: IPostMessage) {
        if(!data.wasNull)
            data.changedPaths.forEach(p => {
                this.getterMap.delete(p);
                this.EmitSet(p);
            });
        
        // var getter = this.ResolveGetterPath(data.rootPath);
        // this.ClearGetterObject(getter);
        // this.EmitSet(data.rootPath);

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

            if(!data.skipDependents && newId) {
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

    /* private ResolveGetterPath(path: string) {
        if(!path)
            return this;
        
        var parts = path.split(".");
        parts[0] = "getterRoot";

        var ret = parts.reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this);

        return ret;
    } */

    private ResolvePropertyPath(path: string) {
        if(!path)
            return this;
        
        return path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this);
    }

    /* private ClearGetterObject(getter: any) {
        if(!getter || typeof getter === 'function' || typeof getter === 'string' || typeof getter === 'number')
            return;
    
        for(var key in getter)
            this.ClearGetterObject(getter[key]);

        getter.___clear && getter.___clear();
    } */

    private CreateGetterObject(source: any, path: string) { //, parentClear: {(): void}) {
        if(IsValue(source))
            return source;

        var ret = null;
        if(Array.isArray(source)) {
            ret = new Array(source.length);
            for(var x=0; x<source.length; x++)
                ret[x] = this.CreateGetterObject(source[x], [path, x].join(".")); // , null);
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

        /* if(parentClear)
            Object.defineProperty(ret, "___clear", {
                value: parentClear,
                configurable: false,
                enumerable: false,
                writable: false
            }); */

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
                // this.WriteToSync(path, val);
                this.WriteToAsync(path, () => val);
            }
        });
    }

    /* private CreateGetter(target: any, parentPath: string, property: string) {
        var path = [parentPath, property].join('.');

        var childGetter: any = null;
        Object.defineProperty(target, property, {
            enumerable: true,
            get: () => {
                if(!childGetter)
                    childGetter = this.CreateGetterObject(this.ResolvePropertyPath(path), path, () => { 
                        childGetter = null;
                        this.EmitSet(path);
                    });
                
                this.EmitGet(path);
                return childGetter;
                // var ret = this.getterMap.get(path);
                //return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
            },
            set: (val: any) => {
                this.WriteToAsync(path, val);
            }
        });
    } */

    /* private CreateGetterObject(source: any, path: string) {
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
    } */

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