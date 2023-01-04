import { ObservableTree } from "../Tree/observableTree";
// import { ObservableProxy, Type } from "../Tree/observableProxy";
import { DiffSync } from "../Diff/diffSync";
import { IDiffResponse } from "../Diff/diffTree";

export class StoreSyncWriter {

    constructor(private diffSync: DiffSync, private observableTree: ObservableTree) { }

    public Write<T>(source: T, data: any) {
        var rootPath = source && this.observableTree.GetPathOf(source) || "ROOT";

        var diff = this.diffSync.DiffPath(rootPath, data);
        this.ApplyChanges(diff);
    }

    public Merge<T>(source: T, data: Partial<T>) {
        var rootPath = this.observableTree.GetPathOf(source);

        var keys = Object.keys(data);
        var message = keys.map(key => ({ path: `${rootPath}.${key}`, value: (data as any)[key] }));
        var diff = this.diffSync.DiffBatch(message);
        this.ApplyChanges(diff);
    }

    public Push<T>(source: Array<T>, data: T) {
        var rootPath = this.observableTree.GetPathOf(source);
        var length = source.length;

        this.diffSync.UpdatePath(`${rootPath}.${length}`, data);
        this.observableTree.Write(`${rootPath}.${length}`, data);
    }

    public Splice<T>(source: Array<T>, start: number, deleteCount?: number, ...items: Array<T>) {        
        var rootPath = this.observableTree.GetPathOf(source);

        var proxy = this.observableTree.Get<Array<T>>(rootPath);
        const array = (proxy as any).toJSON().slice();
        array.splice(start, deleteCount, ...items);

        this.diffSync.UpdatePath(rootPath, array);
        this.observableTree.Write(rootPath, array);
    }

    private ApplyChanges(diff: IDiffResponse) {
        this.observableTree.WriteAll(diff);
    }
}
