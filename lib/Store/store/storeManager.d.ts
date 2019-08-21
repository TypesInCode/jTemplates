import { TreeNode } from "../tree/treeNode";
import { Diff } from "../diff/diff.types";
export declare class StoreManager<T> {
    private data;
    private idFunction;
    private tree;
    private diff;
    constructor(idFunction: {
        (val: any): any;
    }, diff: Diff);
    GetNode(path: string): TreeNode;
    GetIdNode(id: string): TreeNode;
    ResolvePropertyPath(path: string): any;
    Write(value: any): Promise<void>;
    WritePath(path: string, updateCallback: {
        (val: any): void;
    } | any): Promise<void>;
    EmitSet(pathNode: string | TreeNode): void;
    Destroy(): void;
    private BreakUpValue;
    AssignPropertyPath(value: any, path: string): void;
    private ResolveUpdateCallback;
    private ProcessDiff;
}
