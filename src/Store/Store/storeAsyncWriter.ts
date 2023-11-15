import { DiffAsync } from "../Diff/diffAsync";
import { ObservableTree } from "../Tree/observableTree";
import { IDiffResponse } from "../Diff/diffTree";

export class StoreAsyncWriter {

    constructor(private idFunc: {(val: any): string}, private diffAsync: DiffAsync, private observableTree: ObservableTree) { }

    public async Write<T>(source: T, data: any) {
        let path: string;

        if(source) {
            path = this.observableTree.GetPathOf(source);
        }
        else {
            path = this.idFunc(data);
            if(!path)
                throw new Error("data must have an id");
        }

        let diff = await this.diffAsync.DiffPath(path, data);
        this.ApplyChanges(diff);
    }

    public async Merge<T>(source: T, data: Partial<T>) {
        const rootPath = this.observableTree.GetPathOf(source); // proxy.___node.Path;

        const keys = Object.keys(data);
        const message = keys.map(key => ({ path: `${rootPath}.${key}`, value: (data as any)[key] }));
        const diff = await this.diffAsync.DiffBatch(message);
        this.ApplyChanges(diff);
    }

    public async Push<T>(source: Array<T>, data: T) {
        // var proxy = source as ObservableProxy;
        const rootPath = this.observableTree.GetPathOf(source); // proxy.___node.Path;
        var lengthPath = `${rootPath}.length`;
        
        var length = await this.diffAsync.GetPath(lengthPath);
        var diff = await this.diffAsync.DiffPath(`${rootPath}.${length}`, data);
        this.ApplyChanges(diff);
    }

    public async Splice<T>(source: Array<T>, start: number, deleteCount?: number, ...items: Array<T>) { 
        var rootPath = this.observableTree.GetPathOf(source); // proxy.___node.Path;

        var array: Array<T> = await this.diffAsync.GetPath(rootPath);
        array = array.slice();
        array.splice(start, deleteCount, ...items);
        
        var diff = await this.diffAsync.DiffPath(rootPath, array);
        this.ApplyChanges(diff);
    }

    private ApplyChanges(diff: IDiffResponse) {
        this.observableTree.WriteAll(diff);
    }

}
