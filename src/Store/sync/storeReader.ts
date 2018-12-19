import { Store } from './store';
import { Emitter } from '../../emitter';
import { IsValue } from '../utils';
import { scopeCollector } from '../scopeCollector';
import { StoreWriter } from './storeWriter';


export class StoreReader<T> {
    
    private emitterSet: Set<Emitter>;

    public get Writer(): StoreWriter<T> {
        return this.store.GetWriter();
    }

    public get Root(): T {
        var root = this.store.ResolvePropertyPath('root');
        return this.CreateGetterObject(root, 'root');
    }

    public get Emitters() {
        return this.emitterSet;
    }

    constructor(private store: Store<T>) {
        this.emitterSet = new Set();
    }

    public Get<O>(id: string): O {
        var path = this.store.GetPathById(id);
        if(!path)
            return undefined;
        
        this.RegisterEmitter(path);
        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
    }

    private GetCachedArray(path: string) {
        var localArray = this.store.ResolvePropertyPath(path) as Array<any>;
        var cachedArray = this.store.GetCachedArray(path);
        if(cachedArray && cachedArray.length === localArray.length)
            return cachedArray;

        cachedArray = new Array(localArray.length);
        for(var x=0; x<cachedArray.length; x++)
            cachedArray[x] = this.CreateGetterObject(localArray[x], [path, x].join("."));

        this.store.SetCachedArray(path, cachedArray);
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
                        var cachedArray = this.GetCachedArray(path);
                        return ret.bind(cachedArray);
                    }

                    return ret;
                },
                set: (obj: any, prop: any, value: any) => {
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt) {
                        this.Writer.WritePath(childPath, value);
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

                    var childPath = [path, prop].join(".");
                    this.RegisterEmitter(childPath);
                    return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                },
                set: (obj: any, prop: any, value: any) => {
                    var childPath = [path, prop].join(".");
                    this.Writer.WritePath(childPath, value);
                    return true;
                }
            });
        }

        return ret;
    }

    private RegisterEmitter(path: string) {        
        var emitter = this.store.EnsureEmitter(path);
        if(!this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);

        scopeCollector.Register(emitter);
    }

    private EmitSet(path: string) {
        var emitter = this.store.EnsureEmitter(path);
        emitter.emit("set");
    }
}