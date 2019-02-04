import { StoreAsyncManager } from "./storeAsyncManager";
import { IsValue } from "../utils";

export class StoreAsyncWriter<T> {
    
    constructor(private store: StoreAsyncManager<T>) { }

    public async Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O): Promise<void> {
        var path = null;
        if(typeof readOnly === 'string')
            path = await this.store.GetPathById(readOnly);
        
        var path = path || readOnly && (readOnly as any).___path;
        if(!path)
            return;

        await this.WriteTo(path, updateCallback);
    }

    public async WritePath(path: string, value: any): Promise<void> {
        await this.WriteTo(path, value);
    }

    public async Push<O>(readOnly: Array<O>, newValue: O): Promise<void> {
        var path = (readOnly as any).___path;
        
        var localValue = this.store.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, localValue.length].join(".");
        localValue.push(null);

        await this.WriteTo(childPath, newValue)
        this.EmitSet(path);
    }

    public async Unshift<O>(readOnly: Array<O>, newValue: O) {
        var path = (readOnly as any).___path;

        var localValue = this.store.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, 0].join(".");
        localValue.unshift(null);

        await this.WriteTo(childPath, newValue)
        this.EmitSet(path);
    }

    public async Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>) {
        var path = (readOnly as any).___path;

        var localValue = this.store.ResolvePropertyPath(path) as Array<O>;
        var ret = localValue.splice(start, deleteCount, ...items);

        await this.WriteTo(path, localValue)
        this.EmitSet(path);
        return ret;
    }

    private async WriteTo(path: string, updateCallback: {(): any} | any, skipDependents?: boolean): Promise<void> {
        var value = this.ResolveUpdateCallback(path, updateCallback);
        var diff = await this.store.Diff(path, value, !!skipDependents);
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