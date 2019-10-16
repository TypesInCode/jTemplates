import { StoreManager } from "./storeManager";
import { TreeNode } from "../tree/treeNode";
import { CreateProxyArray } from "../utils";

export class StoreWriter<T> {
    
    constructor(private store: StoreManager<T>) { }

    public async Write(value: any) {
        await this.store.Write(value);
    }

    public async Update<O>(readOnly: O | string, updateCallback: { (current: O): void } | O) {
        var path = null;
        if(typeof readOnly === 'string') {
            var node = this.store.GetIdNode(readOnly);
            path = node && node.Path;
            // path = this.store.GetPathById(readOnly);
        }
        
        var path = path || readOnly && (readOnly as any).___node.Path;
        if(!path)
            return;

        await this.store.WritePath(path, updateCallback);
    }

    public async Merge<O>(readOnly: O | string, value: Partial<O>) {
        var path = null;
        if(typeof readOnly === 'string') {
            var node = this.store.GetIdNode(readOnly);
            path = node && node.Path;
            // path = this.store.GetPathById(readOnly);
        }
        
        var path = path || readOnly && (readOnly as any).___node.Path;
        if(!path)
            return;

        await this.store.WritePath(path, (oldValue: O) => {
            for(var key in value)
                oldValue[key] = value[key];
        });
    }

    /* public WritePath(path: string, value: any) {
        this.store.WritePath(path, value);
    } */

    public async Push<O>(readOnly: Array<O>, newValue: O) {
        /* var path = (readOnly as any).___node.Path;
        var array = this.store.ResolvePropertyPath(path) as Array<any>;
        array.push(newValue);
        this.store.WritePath(path, array); */
        /* var path = (readOnly as any).___node.Path;
        var lengthPath = [path, "length"].join(".");
        var length = this.store.ResolvePropertyPath(lengthPath);
        var childPath = [path, length].join(".");

        this.store.WritePath(childPath, newValue)
        this.store.EmitSet(path); */

        var node = (readOnly as any).___node as TreeNode;
        var lengthPath = [node.Path, 'length'].join(".");
        var length = this.store.ResolvePropertyPath(lengthPath);
        var childPath = [node.Path, length].join(".");
        await this.store.WritePath(childPath, newValue);
        this.store.EmitSet(node.Path);
    }

    public Pop<O>(readOnly: Array<O>): O {
        var node = (readOnly as any).___node as TreeNode;
        var localValue = this.store.ResolvePropertyPath(node.Path) as Array<O>;
        var ret = localValue.pop();
        this.store.EmitSet(node.Path);
        return ret;
    }

    /* public async Unshift<O>(readOnly: Array<O>, newValue: O) {
        var path = (readOnly as any).___node.Path;

        var localValue = this.store.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, 0].join(".");
        localValue.unshift(null);

        await this.store.WritePath(childPath, newValue);
        this.store.EmitSet(path);
    } */

    public Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>) {
        var args = Array.from(arguments).slice(1);
        var arrayNode = (readOnly as any).___node as TreeNode;
        // var localValue = node.Value;
        var localValue = this.store.ResolvePropertyPath(arrayNode.Path);

        var proxyArray = CreateProxyArray(arrayNode, null);
        var removedProxies = proxyArray.splice.apply(proxyArray, args);
        for(var x=0; x<removedProxies.length; x++) {
            let node = removedProxies[x] && (removedProxies[x] as any).___node as TreeNode;
            if(node)
                node.Destroy();
        }

        for(var x=start + items.length; x<proxyArray.length; x++) {
            let node = proxyArray[x] && (proxyArray[x] as any).___node as TreeNode;

            if(node) {
                node.Property = x.toString();
                // node.UpdateParentKey();
            }
        }

        var ret = localValue.splice.apply(localValue, args);
        // this.store.AssignPropertyPath(localValue, node.Path);

        this.store.EmitSet(arrayNode);
        return ret;
    }

}