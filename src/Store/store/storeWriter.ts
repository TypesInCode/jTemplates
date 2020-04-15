import { ObservableTree } from "../Tree/observableTree";
import { ObservableProxy, Type } from "../Tree/observableProxy";

export class StoreWriter {

    constructor(private observableTree: ObservableTree) { }

    public Write<T>(source: T | ObservableProxy, data: any) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy && proxy.___node.Path || "ROOT";

        this.observableTree.Write(rootPath, data);
    }

    public Merge<T>(source: T | ObservableProxy, data: Partial<T>) {
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        if(ObservableProxy.TypeOf(data) === Type.Value)
            this.observableTree.Write(rootPath, data);
        else
            for(var key in data)
                this.observableTree.Write(`${rootPath}.${key}`, data[key]);
    }

    public Push<T>(source: Array<T> | ObservableProxy, data: T) {
        var array = source as Array<T>;
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;
        var length = array.length;

        this.observableTree.Write(`${rootPath}.${length}`, data);
    }

    public Splice<T>(source: Array<T> | ObservableProxy, start: number, deleteCount?: number, ...items: Array<T>) {        
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var array = this.observableTree.Get<Array<T>>(rootPath);
        array = array.map(val => val);
        array.splice(start, deleteCount, ...items);
        this.observableTree.Write(rootPath, array);
    }

}