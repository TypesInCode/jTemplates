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

        this.data = { root: null, id: {} };
        this.tree = new Tree((path: string) => this.ResolvePropertyPath(path)); // this);
        this.diff = diff;
    }

    public Diff(path: string, newValue: any) {
        // var oldValue = this.ResolvePropertyPathInternal(path, true);
        /* if(oldValue && oldValue.___storeProxy)
            oldValue = oldValue.toJSON();
        
        if(newValue && newValue.___storeProxy)
            newValue = newValue.toJSON(); */
        
        return this.diff.Diff(path, newValue, () => this.ResolvePropertyPathInternal(path, true));
    }

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
        return this.ResolvePropertyPathInternal(path, false);
    }

    public async WritePath(path: string, updateCallback: {(): any} | any) {
        var value = this.ResolveUpdateCallback(path, updateCallback);
        var breakUpMap = new Map();
        var brokenValue = this.BreakUpValue(path, value, breakUpMap);
        var diff = await this.Diff(path, brokenValue);
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
            /* var breakDiff = this.Diff(breakPath, breakValue);
            this.AssignPropertyPath(breakValue, breakPath);
            diff.changedPaths.push(...breakDiff.changedPaths);
            diff.deletedPaths.push(...breakDiff.deletedPaths); */
        });

        await Promise.all(promises);
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
    }

    private BreakUpValue(path: string, value: any, map: Map<string, any>): any {
        if(value && value.toJSON && typeof value.toJSON === 'function')
            value = value.toJSON();

        if(IsValue(value)) {
            // map.set(path, value);
            /* if(value && value.toJSON && typeof value.toJSON === 'function')
                return value.toJSON(); */
            
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
            var childPath = [path, key].join(".")
            value[key] = this.BreakUpValue(childPath, value[key], map);
        }

        return value;
    }

    public AssignPropertyPath(value: any, path: string) {
        var parts = path.split(".");
        var prop = parts[parts.length - 1];
        var parentParts = parts.slice(0, parts.length - 1);
        var parentObj = this.ResolvePropertyPathInternal(parentParts.join("."), true);

        (parentObj as any)[prop] = value;
    }

    private ResolvePropertyPathInternal(path: string, skipCopy: boolean) {
        if(!path)
            return this.data;
        
        var value = path.split(".").reduce((pre, curr) => {
            return pre && (pre as any)[curr];
        }, this.data);
        return skipCopy ? value : CreateCopy(value);
    }

    private ResolveUpdateCallback(path: string, updateCallback: {(): any} | any): any {
        if(updateCallback && updateCallback.___storeProxy)
            return updateCallback.toJSON();
        
        if(typeof updateCallback === 'function') {
            var node = this.tree.GetNode(path);
            var localValue = node.Value;
            var ret = (updateCallback as any)(localValue);

            // var localValue = this.ResolvePropertyPathInternal(path, false);
            // var ret = (updateCallback as any)(localValue);
            return typeof ret === 'undefined' ? localValue : ret;
        }
        
        return updateCallback;
    }

    private ProcessDiff(data: IDiffResponse) {
        data.changedPaths.forEach(p => {
            // var node = this.GetNode(p);
            // node && this.ResolveNode(node);
            // this.EmitSet(node || p);
            this.EmitSet(p);
        });

        data.deletedPaths.forEach(p => {
            var node = this.GetNode(p);
            node && node.Destroy();
        });

        data.pathDependencies.forEach(dep => {
            var value = this.ResolvePropertyPathInternal(dep.path, false);
            dep.targets.forEach(target => {
                this.WritePath(target, value);
            });
        });
    }

}