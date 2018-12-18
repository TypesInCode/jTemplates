import { StoreAsync } from './storeAsync';
import { Emitter } from '../../emitter';
import { IsValue } from '../utils';
import { scopeCollector } from '../scopeCollector';


export class StoreAsyncReader<T> {
    
    private emitterSet: Set<Emitter>;

    public get Root(): T {
        var root = this.store.ResolvePropertyPath('root');
        return this.CreateGetterObject(root, 'root');
    }

    public get Emitters() {
        return this.emitterSet;
    }

    constructor(private store: StoreAsync<T>) {
        this.emitterSet = new Set();
    }

    public async Get<O>(id: string): Promise<O> {
        var path = await this.store.GetPathById(id);
        this.RegisterEmitter(path);
        return this.store.ResolvePropertyPath(path);
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
                    
                    var isInt = !isNaN(parseInt(prop));
                    var childPath = [path, prop].join(".");
                    if(isInt)
                        this.RegisterEmitter(childPath);
                    
                    if(isInt || prop === 'length')
                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);

                    return obj[prop];
                },
                set: (obj: any, prop: any, value: any) => {
                    var isInt = !isNaN(parseInt(prop));
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
                    return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), path);
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