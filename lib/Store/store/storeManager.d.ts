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
    WritePaths(keyValues: [string, any][]): Promise<void>;
    WritePath(path: string, value: any): Promise<void>;
    EmitSet(pathNode: string | TreeNode): void;
    Destroy(): void;
    private BreakUpValue;
    AssignPropertyPath(value: any, path: string): void;
    EnsurePropertyPath(path: string): void;
    private ProcessDiff;
}
