import { StoreManager } from "./storeManager";
import { TreeNode } from "../tree/treeNode";
import { IProxy } from "../tree/proxy";
import { TreeNodeRefId } from "../tree/treeNodeRefId";

export class StoreWriter<T> {
    
    constructor(private store: StoreManager<T>) { }

    public async Write(value: any) {
        await this.store.Write(value);
    }

    public async Update<O>(readOnly: O | IProxy, value: O) {     
        var path = readOnly && (readOnly as IProxy).___node.Path;
        if(!path)
            return;

        await this.store.WritePath(path, value);
    }

    public async Merge<O>(readOnly: O | IProxy, value: Partial<O>) {
        var path: string = readOnly &&  (readOnly as IProxy).___node.Path;
        if(!path)
            return;

        var keys = Object.keys(value);
        var writes = keys.map(key => [[path, key].join("."), (value as any)[key]] as [string, any]);
        await this.store.WritePaths(writes);
    }

    public async Push<O>(readOnly: Array<O> | IProxy, newValue: O) {
        var node = (readOnly as IProxy).___node as TreeNode;
        var lengthNode = node.EnsureChild('length');
        var length = lengthNode.StoreValue;
        var childPath = [node.Path, length].join(".");
        await this.store.WritePath(childPath, newValue);
        this.store.EmitSet(node.Path);
    }

    public async Splice<O>(readOnly: Array<O> | IProxy, start: number, deleteCount?: number, ...items: Array<O>) {
        var node = (readOnly as IProxy).___node;
        var array = node.Proxy.toJSON() as Array<O>;
        var ret = array.splice(start, deleteCount, ...items);
        await this.Update<Array<O>>(node.Proxy, array);
        return ret;
    }

}