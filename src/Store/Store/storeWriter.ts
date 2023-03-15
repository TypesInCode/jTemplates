import { ObservableTree } from "../Tree/observableTree";

export class StoreWriter {

    constructor(private observableTree: ObservableTree) { }

    public Write<T>(source: T , data: any) {
        const rootPath = source && this.observableTree.GetPathOf(source) || "ROOT";
        this.observableTree.Write(rootPath, data);
    }

    public Merge<T>(source: T, data: Partial<T>) {
        const rootPath = this.observableTree.GetPathOf(source);

        for(const key in data)
            this.observableTree.Write(`${rootPath}.${key}`, data[key]);
    }

    public Push<T>(source: Array<T>, data: T) {
        const rootPath = this.observableTree.GetPathOf(source);
        this.observableTree.Write(`${rootPath}.${source.length}`, data);
    }

    public Splice<T>(source: Array<T>, start: number, deleteCount?: number, ...items: Array<T>) {
        const json = (source as any).toJSON() as T[];
        const copy = json.slice();
        copy.splice(start, deleteCount, ...items);
        const rootPath = this.observableTree.GetPathOf(source);
        this.observableTree.Write(rootPath, copy);
    }

}
