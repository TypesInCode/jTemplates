import { Tree } from "../tree/tree";
import { TreeNode } from "../tree/treeNode";
import { TreeNodeRefId } from "../tree/treeNodeRefId";
import { IDiffResponse, Diff } from "../diff/diff.types";
import { IProxy, IProxyType } from "../tree/proxy";

export class StoreManager<T> {

    private data: { root: T, id: { [id: string]: any } };
    private idFunction: {(val: any): any};
    private tree: Tree;
    private diff: Diff;

    constructor(idFunction: {(val: any): any}, diff: Diff) {
        this.idFunction = idFunction;

        this.data = { root: null, id: {} };
        this.tree = new Tree((path: string) => this.ResolvePropertyPath(path));
        this.diff = diff;
    }

    public GetNode(path: string): TreeNode {
        return this.tree.GetNode(path);
    }

    public GetIdNode(id: string): TreeNode {
        var node = this.tree.GetIdNode(id);
        /* if(node.Proxy === undefined)
            this.AssignPropertyPath(null, node.Path); */

        return node;
    }

    public ResolvePropertyPath(path: string) {
        if(!path)
            return this.data;
        
        var value = path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this.data);
        return value;
    }

    public async Write(value: any) {
        var id = this.idFunction(value);
        if(!id)
            throw "Written value must have an id";

        var path = ["id", id].join(".");
        this.EnsurePropertyPath(path);
        await this.WritePath(path, value);
    }

    public async WritePaths(keyValues: [string, any][]) {
        var batch = new Array();
        for(var x=0; x<keyValues.length; x++) {
            var path = keyValues[x][0];
            var value = keyValues[x][1];
            var breakUpMap = this.BreakUpValue(path, value);
            breakUpMap.forEach((value, key) => {
                batch.push({
                    path: key,
                    newValue: value,
                    oldValue: this.ResolvePropertyPath(key)
                });
            });
        }

        var diff = await this.diff.DiffBatch(batch);
        for(var x=0; x<batch.length; x++)
            this.AssignPropertyPath(batch[x].newValue, batch[x].path);

        this.ProcessDiff(diff);
    }

    public async WritePath(path: string, value: any) {
        var breakUpMap = this.BreakUpValue(path, value);
        var batch = new Array(breakUpMap.size);
        var index = 0;
        breakUpMap.forEach((value, key) => {
            batch[index] = {
                path: key,
                newValue: value,
                oldValue: this.ResolvePropertyPath(key)
            };
            index++;
        });

        var diff = await this.diff.DiffBatch(batch);
        for(var x=0; x<batch.length; x++)
            this.AssignPropertyPath(batch[x].newValue, batch[x].path);

        this.ProcessDiff(diff);
    }

    public EmitSet(pathNode: string | TreeNode) {
        var node = null;
        if(pathNode instanceof TreeNode)
            node = pathNode;
        else
            node = this.GetNode(pathNode);

        node && node.Emitter.emit("set");
    }

    public Destroy() {
        this.data.root = null;
        this.tree.Destroy();
        this.diff.Destroy();
    }

    private BreakUpValue(path: string, parent: any, key?: string, map?: Map<string, any>): Map<string, any> {
        var value = key ? parent[key] : parent;
        var id = this.idFunction && this.idFunction(value);
        var hasId = id || id === 0;
        var idPath = hasId && ["id", id].join(".");
        var treeNodeRef = hasId && TreeNodeRefId.GetString(id);

        if(!map) {
            map = new Map();
            map.set(path, hasId && path !== idPath ? treeNodeRef : value);
        }
        
        if(value && value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();

        if(IProxy.ValueType(value) === IProxyType.Value) {
            return map;
        }

        if(hasId && path !== idPath) {
            if(key)
                parent[key] = treeNodeRef;
            
            map.set(idPath, value);
            this.BreakUpValue(idPath, value, null, map);
        }
        else {
            for(var key in value) {
                var childPath = [path, key].join(".");
                this.BreakUpValue(childPath, value, key, map);
            }
        }

        return map;
    }

    public AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join(".")) as any;

        parentObj[prop] = value;
    }

    public EnsurePropertyPath(path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join(".")) as any;

        if(parentObj[prop] === undefined)
            parentObj[prop] = null;
    }

    private ProcessDiff(data: IDiffResponse) {
        var emit = new Set<string>();
        data.changedPaths.forEach(p => {
            var match = p.match(/(.+)\.[^.]+$/);
            var parent = match && match[1];
            if(parent && !emit.has(parent) && Array.isArray(this.ResolvePropertyPath(parent)))
                emit.add(parent);

            this.EmitSet(p);
        });

        emit.forEach(path => this.EmitSet(path));

        data.deletedPaths.forEach(p => {
            var node = this.GetNode(p);
            node && node.Destroy();
        });
    }

}