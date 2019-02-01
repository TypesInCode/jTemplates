import { StoreAsyncManager } from './storeAsyncManager';
import { Emitter } from '../../emitter';
import { IsValue } from '../utils';
import { scopeCollector } from '../scopeCollector';
import { StoreAsyncWriter } from './storeAsyncWriter';


export class StoreAsyncReader<T> {
    
    private emitterSet: Set<Emitter>;
    private writer: StoreAsyncWriter<T>;
    private watching: boolean;
    private destroyed: boolean;

    public get Root(): T {
        var root = this.store.ResolvePropertyPath("root");
        this.RegisterEmitter("root");
        return this.CreateGetterObject(root, "root");
    }

    public get Emitters() {
        return this.emitterSet;
    }

    public get Watching() {
        return this.watching;
    }

    public set Watching(val: boolean) {
        this.emitterSet = val ? new Set() : this.emitterSet;
        this.watching = val;
    }

    constructor(private store: StoreAsyncManager<T>) {
        this.watching = false;
        this.writer = new StoreAsyncWriter<T>(store);
    }

    public async Get<O>(id: string): Promise<O> {
        var path = await this.store.GetPathById(id);
        if(!path)
            return undefined;
        
        this.RegisterEmitter(path);
        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
    }

    public Destroy() {
        this.destroyed = true;
        this.watching = false;
        this.emitterSet.clear();
    }

    private GetArray(path: string) {
        var localArray = this.store.ResolvePropertyPath(path) as Array<any>;
        var cachedArray = new Array(localArray.length);
        for(var x=0; x<cachedArray.length; x++)
            cachedArray[x] = this.CreateGetterObject(localArray[x], [path, x].join("."));

        return cachedArray;
    }

    private CreateGetterObject(source: any, path: string): any {
        if(IsValue(source) || source.___storeProxy) {
            this.RegisterEmitter(path);
            return source;
        }

        var ret = null;
        if(Array.isArray(source)) {
            ret = new Proxy([], {
                get: (obj: any, prop: any) => {
                    if(prop === '___storeProxy')
                        return true;
                    
                    if(prop === '___path')
                        return path;

                    if(prop === 'toJSON')
                        return () => {
                            return this.store.ResolvePropertyPath(path);
                        };
                    
                    if(typeof prop !== 'symbol') {
                        var isInt = !isNaN(parseInt(prop));
                        var childPath = [path, prop].join(".");

                        if(isInt)
                            this.RegisterEmitter(childPath);
                        
                        if(isInt || prop === 'length')
                            return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                    }
                    
                    var ret = obj[prop];
                    if(typeof ret === 'function') {
                        var cachedArray = this.GetArray(path);
                        return ret.bind(cachedArray);
                    }

                    return ret;
                },
                set: (obj: any, prop: any, value: any) => {
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt) {
                        this.writer.WritePath(childPath, value);
                    }
                    else {
                        obj[prop] = value;
                    }

                    return true;
                }
            });
        }
        else {
            ret = new Proxy({}, {
                get: (obj: any, prop: any) => {
                    if(prop === '___storeProxy')
                        return true;
                    
                    if(prop === '___path')
                        return path;

                    if(prop === 'toJSON')
                        return () => {
                            return this.store.ResolvePropertyPath(path);
                        };

                    if(typeof prop !== 'symbol') {
                        var childPath = [path, prop].join(".");
                        this.RegisterEmitter(childPath);
                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                    }

                    return obj[prop];
                },
                set: (obj: any, prop: any, value: any) => {
                    var childPath = [path, prop].join(".");
                    this.writer.WritePath(childPath, value);
                    return true;
                }
            });
        }

        return ret;
    }

    private RegisterEmitter(path: string) {
        if(this.destroyed)
            return;

        var emitter = this.store.EnsureEmitter(path);
        if(this.watching && !this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);

        scopeCollector.Register(emitter);
    }

}