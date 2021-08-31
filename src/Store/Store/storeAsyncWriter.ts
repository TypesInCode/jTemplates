import { DiffAsync } from "../Diff/diffAsync";
import { ObservableTree } from "../Tree/observableTree";
import { IDiffResponse } from "../Diff/diffTree";
import { ObservableProxy } from "../Tree/observableProxy";

export class StoreAsyncWriter {

    constructor(private idFunc: {(val: any): string}, private diffAsync: DiffAsync, private observableTree: ObservableTree) { }

    public async Write<T>(source: T | ObservableProxy, data: any) {
        var path: string;

        if(source) {
            var proxy = source as ObservableProxy;
            path = proxy.___node.Path;
        }
        else {
            path = this.idFunc(data);
            if(!path)
                throw new Error("data must have an id");
        }

        var diff = await this.diffAsync.DiffPath(path, data);
        this.ApplyChanges(diff);
    }

    public async Merge<T>(source: T | ObservableProxy, data: Partial<T>) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var keys = Object.keys(data);
        var message = keys.map(key => ({ path: `${rootPath}.${key}`, value: (data as any)[key] }));
        var diff = await this.diffAsync.DiffBatch(message);
        this.ApplyChanges(diff);
    }

    public async Push<T>(source: Array<T> | ObservableProxy, data: T) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;
        var lengthPath = `${rootPath}.length`;
        
        var length = await this.diffAsync.GetPath(lengthPath);
        var diff = await this.diffAsync.DiffPath(`${rootPath}.${length}`, data);
        this.ApplyChanges(diff);
    }

    public async Splice<T>(source: Array<T> | ObservableProxy, start: number, deleteCount?: number, ...items: Array<T>) {        
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var array: Array<T> = await this.diffAsync.GetPath(rootPath); // this.observableTree.Get<Array<T>>(rootPath);
        array = array.slice();
        array.splice(start, deleteCount, ...items);
        
        var diff = await this.diffAsync.DiffPath(rootPath, array);
        this.ApplyChanges(diff);
    }

    private ApplyChanges(diff: IDiffResponse) {
        this.observableTree.WriteAll(diff);
    }

}
