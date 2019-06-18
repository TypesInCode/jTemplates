import { StoreManager } from "./storeManager";
import { TreeNode } from "../tree/treeNode";
import { CreateProxyArray } from "../utils";

export class StoreWriter<T> {
    
    constructor(private store: StoreManager<T>) { }

    public async Write<O>(readOnly: O | string, updateCallback: { (current: O): O } | { (current: O): void } | O) {
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

    public async Unshift<O>(readOnly: Array<O>, newValue: O) {
        var path = (readOnly as any).___node.Path;

        var localValue = this.store.ResolvePropertyPath(path) as Array<O>;
        var childPath = [path, 0].join(".");
        localValue.unshift(null);

        await this.store.WritePath(childPath, newValue);
        this.store.EmitSet(path);
    }

    public Splice<O>(readOnly: Array<O>, start: number, deleteCount?: number, ...items: Array<O>) {
        var args = Array.from(arguments).slice(1);
        var node = (readOnly as any).___node as TreeNode;
        var localValue = node.Value;

        /* var children = Array.from(node.Children);
        var removedChildren = children.splice.apply(children, args) as [string, TreeNode][];
        for(var x=0; x<removedChildren.length; x++)
            removedChildren[x][1].Destroy();

        for(var x=0; x<children.length; x++)
            children[x][1].ParentKey = children[x][1].Property = children[x][0] = x.toString();

        node.OverwriteChildren(children); */

        var proxyArray = CreateProxyArray(node, null); //, this.store);
        var removedProxies = proxyArray.splice.apply(proxyArray, args); //(start, deleteCount, ...items);
        for(var x=0; x<removedProxies.length; x++)
            ((removedProxies[x] as any).___node as TreeNode).Destroy();

        for(var x=start + items.length; x<proxyArray.length; x++) {
            ((proxyArray[x] as any).___node as TreeNode).Property = x.toString();
            ((proxyArray[x] as any).___node as TreeNode).UpdateParentKey();
        }

        var ret = localValue.splice.apply(localValue, args); //(start, deleteCount, ...items);
        // this.store.WritePath(node.Path, localValue);
        this.store.AssignPropertyPath(localValue, node.Path);

        this.store.EmitSet(node);
        return ret;
    }

}