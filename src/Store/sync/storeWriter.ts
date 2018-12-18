import { Store } from "./store";
import { IsValue } from "../utils";
import { StoreReader } from "./storeReader";
import { StoreQuery } from "./storeQuery";

export class StoreWriter<T> {

    public set Root(val: T) {
        this.WriteTo("root", val);
    }
    
    constructor(private store: Store<T>) { }

    public Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O) {
        var path = null;
        if(typeof readOnly === 'string')
            path = this.store.GetPathById(readOnly);
        
        var path = path || readOnly && (readOnly as any).___path;
        if(!path)
            return;

        this.WriteTo(path, updateCallback);
    }

    public Query<O>(callback: {(reader: StoreReader<T>): O}) {
        return new StoreQuery<O>(this.store, callback);
    }

    private WriteTo(path: string, updateCallback: {(): any} | any, skipDependents?: boolean) {
        var value = this.ResolveUpdateCallback(path, updateCallback);
        var diff = this.store.Diff(path, value, !!skipDependents);
        this.store.AssignPropertyPath(value, path);
        this.ProcessDiff(diff);
    }

    private ResolveUpdateCallback(path: string, updateCallback: {(): any}): any {
        if(typeof updateCallback === 'function') {
            var localValue = this.store.ResolvePropertyPath(path);
            var mutableCopy = this.CreateCopy(localValue);
            var ret = (updateCallback as any)(mutableCopy);
            return typeof ret === 'undefined' ? mutableCopy : ret;
        }
        
        return updateCallback;
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

    private ProcessDiff(data: IDiffResponse) {
        data.changedPaths.forEach(p => {
            this.EmitSet(p);
        });

        data.deletedPaths.forEach(p => {
            this.store.DeleteEmitter(p);
        });

        data.pathDependencies.forEach(dep => {
            var value = this.store.ResolvePropertyPath(dep.path);
            dep.targets.forEach(target => {
                this.WriteTo(target, value, true);
            });
        });
    }

    private EmitSet(path: string) {
        var emitter = this.store.EnsureEmitter(path);
        emitter.emit("set");
    }

}