import { ObservableTree } from "../Tree/observableTree";
import { ObservableProxy, Type } from "../Tree/observableProxy";
import { ObservableNode } from "../Tree/observableNode";

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
        // var array = source as Array<T>;
        var proxy = source as ObservableProxy;
        proxy.___node.Push(data);
        /* var rootPath = proxy.___node.Path;
        var length = array.length;

        this.observableTree.Write(`${rootPath}.${length}`, data); */
    }

    public Splice<T>(source: Array<T> | ObservableProxy, start: number, deleteCount?: number, ...items: Array<T>) {
        var proxy = source as ObservableProxy;
        proxy.___node.Splice(start, deleteCount, ...items);
        /* var rootPath = proxy.___node.Path;
        var node = this.observableTree.GetNode(rootPath);
        return node.Splice(start, deleteCount, ...items); */
        /* deleteCount = deleteCount || 0;
        var proxy = source as ObservableProxy;
        var rootPath = proxy.___node.Path;

        var array = this.observableTree.Get<Array<T>>(rootPath);        
        var startLength = array.length;
        // array = array.map(val => val);
        array.splice(start, deleteCount, ...items);
        var node = this.observableTree.GetNode(rootPath);

        var x = start;
        var key: string = null;
        var newKey: string = null;
        var child: ObservableNode = null;

        for(; x<(start + deleteCount); x++) {
            key = x.toString();
            child = node.Children.get(key);
            if(child)
                child.Destroy();
        }

        if(startLength < array.length)
            for(var y=startLength - 1; y >= x; y--) {
                key = y.toString();
                child = node.Children.get(key);
                if(child) {
                    newKey = (y - deleteCount + items.length).toString();
                    child.UpdateKey(newKey);
                }
            }
        else
            for(; x<startLength; x++) {
                key = x.toString();
                child = node.Children.get(key);
                if(child) {
                    newKey = (x - deleteCount + items.length).toString();
                    child.UpdateKey(newKey);
                }
            }

        node.ArrayUpdate(); */

        /* var x = start;
        for(; x<deleteCount; x++) {
            var key = x.toString();
            var child = node.Children.get(key);
            if(child)
                if((x - start) < items.length)
                    child.Update();
                else
                    child.Destroy();
        }

        for(; x<(start + (items.length - deleteCount)); x++) {
            var key = x.toString();
            var child = node.Children.get(key);
            if(child)
                child.Update();
        }

        x = start;
        for(; x<array.length; x++) {
            var key = (x + deleteCount).toString();
            var child = node.Children.get(key);
            if(child) {
                child.UpdateKey(x.toString());
                if(x - start < items.length)
                    child.Update();
            }
        }

        for(; x<startLength; x++) {
            var key = x.toString();
            var child = node.Children.get(key);
            if(child)
                child.Destroy();
        }

        node.EmitSet();
        /* var removed = deleteCount - items.length;
        if(removed > ) */
        // this.observableTree.Write(rootPath, array);
    }

}
