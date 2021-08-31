import { ObservableTree } from "../Tree/observableTree";
import { ObservableProxy, Type } from "../Tree/observableProxy";
import { DiffSync } from "../Diff/diffSync";
import { IDiffResponse } from "../Diff/diffTree";

export class StoreSyncWriter {

    constructor(private diffSync: DiffSync, private observableTree: ObservableTree) { }

    public Write<T>(source: T | ObservableProxy, data: any) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy && proxy.___node.Path || "ROOT";

        var diff = this.diffSync.DiffPath(rootPath, data);
        this.ApplyChanges(diff);
    }

    public Merge<T>(source: T | ObservableProxy, data: Partial<T>) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var keys = Object.keys(data);
        var message = keys.map(key => ({ path: `${rootPath}.${key}`, value: (data as any)[key] }));
        var diff = this.diffSync.DiffBatch(message);
        this.ApplyChanges(diff);
    }

    public Push<T>(source: Array<T> | ObservableProxy, data: T) {
        var array = source as Array<T>;
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;
        var length = array.length;

        this.diffSync.UpdatePath(`${rootPath}.${length}`, data);
        proxy.___node.Push(data);
    }

    public Splice<T>(source: Array<T> | ObservableProxy, start: number, deleteCount?: number, ...items: Array<T>) {        
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var array = this.observableTree.Get<Array<T>>(rootPath);
        array = array.map(val => val);
        array.splice(start, deleteCount, ...items);

        this.diffSync.UpdatePath(rootPath, array);
        return proxy.___node.Splice(start, deleteCount, ...items);
    }

    private ApplyChanges(diff: IDiffResponse) {
        this.observableTree.WriteAll(diff);
    }
}
