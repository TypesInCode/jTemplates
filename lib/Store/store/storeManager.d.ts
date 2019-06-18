import { TreeNode } from "../tree/treeNode";
import { IDiffResponse, Diff } from "../diff/diff.types";
export declare class StoreManager<T> {
    private data;
    private idFunction;
    private tree;
    private diff;
    constructor(idFunction: {
        (val: any): any;
    }, diff: Diff);
    Diff(path: string, newValue: any): Promise<IDiffResponse>;
    GetNode(path: string): TreeNode;
    GetIdNode(id: string): TreeNode;
    ResolvePropertyPath(path: string): any;
    WritePath(path: string, updateCallback: {
        (): any;
    } | any): Promise<void>;
    EmitSet(pathNode: string | TreeNode): void;
    Destroy(): void;
    private BreakUpValue;
    AssignPropertyPath(value: any, path: string): void;
    private ResolvePropertyPathInternal;
    private ResolveUpdateCallback;
    private ProcessDiff;
}
