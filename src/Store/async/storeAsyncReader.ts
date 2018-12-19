import { StoreAsync } from './storeAsync';
import { Emitter } from '../../emitter';
import { IsValue } from '../utils';
import { scopeCollector } from '../scopeCollector';
import { StoreAsyncWriter } from '../..';


export class StoreAsyncReader<T> {
    
    private emitterSet: Set<Emitter>;

    public get Writer(): StoreAsyncWriter<T> {
        return this.store.GetWriter();
    }

    /* public get Root(): T {
        var root = this.store.ResolvePropertyPath('root');
        return this.CreateGetterObject(root, 'root');
    } */

    public get Emitters() {
        return this.emitterSet;
    }

    constructor(private store: StoreAsync<T>) {
        this.emitterSet = new Set();
    }

    public async Get<O>(id: string): Promise<O> {
        var path = await this.store.GetPathById(id);
        if(!path)
            return undefined;
        
        this.RegisterEmitter(path);
        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
    }

    private CreateGetterObject(source: any, path: string): any {
        if(IsValue(source)) {
            this.RegisterEmitter(path);
            return source;
        }

        var ret = null;
        if(Array.isArray(source)) {
            ret = new Proxy([], {
                get: (obj: any, prop: any) => {
                    if(prop === '___path')
                        return path;
                    
                    var isInt = typeof prop !== 'symbol' && !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt)
                        this.RegisterEmitter(childPath);
                    
                    if(isInt || prop === 'length')
                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);

                    var ret = obj[prop];
                    if(typeof ret === 'function') {
                        var arr = this.store.ResolvePropertyPath(path);
                        var tempArr = new Array(arr.length);
                        for(var x=0; x<arr.length; x++)
                            tempArr[x] = this.CreateGetterObject(arr[x], [path, x].join("."));

                        return ret.bind(tempArr);
                    }

                    return ret;
                },
                set: (obj: any, prop: any, value: any) => {
                    var isInt = typeof prop !== 'symbol' && !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt) {
                        this.store.AssignPropertyPath(value, childPath);
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
                    if(prop === '___path')
                        return path;

                    var childPath = [path, prop].join(".");
                    this.RegisterEmitter(childPath);
                    return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
                },
                set: (obj: any, prop: any, value: any) => {
                    var childPath = [path, prop].join(".");
                    this.store.AssignPropertyPath(value, childPath);
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
}