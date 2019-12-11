import { Tree } from "../tree/tree";
import { TreeNode } from "../tree/treeNode";
import { CreateCopy, IsValue } from "../utils";
import { TreeNodeRefId } from "../tree/treeNodeRefId";
import { IDiffResponse, Diff } from "../diff/diff.types";

export class StoreManager<T> {

    private data: { root: T, id: { [id: string]: any } };
    private idFunction: {(val: any): any};
    private tree: Tree;
    private diff: Diff;

    constructor(idFunction: {(val: any): any}, diff: Diff) {
        this.idFunction = idFunction;

        this.data = { root: undefined, id: {} };
        this.tree = new Tree((path: string) => this.ResolvePropertyPath(path)); // this);
        this.diff = diff;
    }

    /* public async Diff(path: string, newValue: any) {        
        return await this.diff.Diff(path, newValue, () => this.ResolvePropertyPath(path));
    } */

    /* public GetPathById(id: string): string {
        return this.diff.GetPath(id);
    } */

    public GetNode(path: string): TreeNode {
        return this.tree.GetNode(path);
    }

    public GetIdNode(id: string): TreeNode {
        return this.tree.GetIdNode(id);
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
        await this.WritePath(path, value);
    }

    public async WritePath(path: string, updateCallback: {(val: any): void} | any) {
        var value = this.ResolveUpdateCallback(path, updateCallback);
        var breakUpMap = new Map();
        var brokenValue = this.BreakUpValue(path, value, breakUpMap);
        var batch = [{ path: path, newValue: brokenValue, oldValue: this.ResolvePropertyPath(path) }];
        breakUpMap.forEach((value, key) => {
            batch.push({
                path: key,
                newValue: value,
                oldValue: this.ResolvePropertyPath(key)
            });
        });

        var diff = await this.diff.DiffBatch(batch);
        for(var x=0; x<batch.length; x++)
            this.AssignPropertyPath(batch[x].newValue, batch[x].path);

        /* var diff = await this.Diff(path, brokenValue);
        this.AssignPropertyPath(brokenValue, path);

        var promises = [] as Array<Promise<void>>;
        breakUpMap.forEach((breakValue, breakPath) => {
            promises.push(new Promise((resolve, reject) => {
                this.Diff(breakPath, breakValue).then((val) => {
                    this.AssignPropertyPath(breakValue, breakPath);
                    diff.changedPaths.push(...val.changedPaths);
                    diff.deletedPaths.push(...val.deletedPaths);
                    resolve();
                });
            }));
        });

        await Promise.all(promises); */
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

    private BreakUpValue(path: string, value: any, map: Map<string, any>): any {
        if(value && value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();

        if(IsValue(value)) {            
            return value;
        }

        var id = this.idFunction && this.idFunction(value);
        var idPath = ["id", id].join(".");
        if((id || id === 0) && path !== idPath && !map.has(idPath)) {
            map.set(idPath, value);
            this.BreakUpValue(idPath, value, map);
            return TreeNodeRefId.GetString(id); // new TreeNodeRefId(this.tree, id);
        }

        for(var key in value) {
            var childPath = [path, key].join(".");
            value[key] = this.BreakUpValue(childPath, value[key], map);
        }

        return value;
    }

    public AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPath(parentParts.join("."));

        (parentObj as any)[prop] = value;
    }

    private ResolveUpdateCallback(path: string, updateCallback: {(): any} | any): any {
        /* if(updateCallback && updateCallback.___storeProxy)
            return updateCallback.toJSON(); */
        
        if(typeof updateCallback === 'function') {
            var node = this.tree.GetNode(path);
            // var localValue = node.Value;
            var localValue = CreateCopy(this.ResolvePropertyPath(node.Self.Path))
            updateCallback(localValue);

            // var localValue = this.ResolvePropertyPathInternal(path, false);
            // var ret = (updateCallback as any)(localValue);
            return localValue;
        }
        
        return updateCallback;
    }

    private ProcessDiff(data: IDiffResponse) {
        var emit = new Set<string>();
        data.changedPaths.forEach(p => {
            // var node = this.GetNode(p);
            // node && this.ResolveNode(node);
            // this.EmitSet(node || p);
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

        /* data.pathDependencies.forEach(dep => {
            var value = this.ResolvePropertyPath(dep.path, false);
            dep.targets.forEach(target => {
                this.WritePath(target, value);
            });
        }); */
    }

}