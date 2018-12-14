import Emitter from "../emitter";
import { asyncWatcher } from './asyncWatcher';
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
    private root: T;
    private worker: Worker;
    private workerQueue: WorkerQueue<IDiffMethod, any>;

    public get Root(): T {
        this.EmitGet("root");
        var ret = this.getterMap.get("root");
        return ret || this.CreateGetterObject(this.root, "root");
    }

    public set Root(val: T) {
        this.WriteToAsync("root", val);
    }

    constructor(idCallback?: { (val: any): any }) {
        this.getIdCallback = idCallback;
        this.emitterMap = new Map();
        this.emitterMap.set("root", new Emitter());
        this.getterMap = new Map();
        this.worker = ObjectStoreWorker.Create();
        this.workerQueue = new WorkerQueue(this.worker);
        this.workerQueue.Push(() => ({ method: "create", arguments: [this.getIdCallback && this.getIdCallback.toString()] }));
    }

    public Scope<O>(valueFunction: {(root: T): Promise<O> | O}, defaultValue: O): Scope<O> {
        return new Scope(() => valueFunction(this.Root), defaultValue);
    }

    public Get<O>(id: string): Promise<O> {
        /* var paths = this.idToPathsMap.get(id);
        if(!paths)
            return null;

        var path = paths.values().next().value; */
        return new Promise((resolve, reject) => {
            this.workerQueue.Push(() => ({
                method: "getpath",
                arguments: [id]
            })).then(path => {
                if(!path) {
                    resolve();
                    return;
                }
    
                this.EmitGet(path);
                var ret = this.getterMap.get(path);
                resolve(ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path));
            }).catch(reject);
            this.workerQueue.Process();
        });
    }

    public WriteComplete() {
        return this.workerQueue.OnComplete();
    }

    public async Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O): Promise<any> {
        if(typeof readOnly === 'string')
            readOnly = await this.Get<O>(readOnly);
        
        var path = readOnly && (readOnly as any).___path;
        if(!path)
            return;

        return this.WriteToAsync(path, updateCallback);
    }

    public async Push<O>(readOnly: Array<O>, newValue: O): Promise<void> {
        var path = (readOnly as any).___path;
        
        var localValue = this.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, localValue.length].join(".");
        localValue.push(null);

        var getterValue = this.getterMap.get(path) as Array<O>;
        getterValue.push(this.CreateGetterObject(newValue, childPath));

        await this.WriteToAsync(childPath, newValue)
        this.EmitSet(path);
    }

    private WriteToAsync(path: string, updateCallback: {(): any} | any, skipDependents?: boolean): Promise<void> {
        return new Promise<void>(resolve => {
            var value: any = null;
            var promise = this.workerQueue.Push(() => {
                value = this.ResolveUpdateCallback(path, updateCallback);
                return {
                    method: "diff",
                    arguments: [path, value, this.ResolvePropertyPath(path), skipDependents]
                };
            }).then((resp: IDiffResponse) => {
                this.AssignPropertyPath(value, path);
                this.ProcessDiff(resp);
            });
            resolve(promise);
            this.workerQueue.Process();
        });
    }

    private ResolveUpdateCallback(path: string, updateCallback: {(): any}): any {
        if(typeof updateCallback === 'function') {
            var localValue = this.ResolvePropertyPath(path);
            var mutableCopy = this.CreateCopy(localValue);
            var ret = (updateCallback as any)(mutableCopy);
            return typeof ret === 'undefined' ? mutableCopy : ret;
        }
        
        return updateCallback;
    }

    private ProcessDiff(data: IDiffResponse) {
        data.changedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.EmitSet(p);
        });

        data.deletedPaths.forEach(p => {
            this.getterMap.delete(p);
            this.emitterMap.delete(p);
        });

        data.pathDependencies.forEach(dep => {
            var value = this.ResolvePropertyPath(dep.path);
            dep.targets.forEach(target => {
                this.WriteToAsync(target, value, true);
            });
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
            /* ret = new Proxy(new Array(source.length), {
                get: (obj: Array<any>, prop: any) => {
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt && typeof obj[prop] === 'undefined') {
                        obj[prop] = this.CreateGetterObject(this.ResolvePropertyPath(childPath), childPath);
                    }

                    isInt && this.EmitGet(childPath);
                    return obj[prop];
                },
                set: (obj: Array<any>, prop: any, value: any) => {
                    if(!isNaN(parseInt(prop))) {
                        var childPath = [path, prop].join(".");
                        this.WriteToAsync(childPath, value);
                    }
                    else
                        obj[prop] = value;             
                    
                    return true;
                }
            }); */
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

        asyncWatcher.Register(emitter);
    }
}

export namespace StoreAsync {
    export async function Create<T>(value: T, idCallback?: { (val: any): any }): Promise<StoreAsync<T>> {
        if(IsValue(value))
            throw "Only arrays and JSON types are supported";

        var store = new StoreAsync<T>(idCallback);
        store.Root = value;
        await store.WriteComplete();
        return store;
    }
}