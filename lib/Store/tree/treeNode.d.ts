import Emitter from "../../emitter";
import { Tree } from "./tree";
export declare class TreeNode {
    private destroyed;
    private tree;
    private parentNode;
    private children;
    private emitter;
    private parentKey;
    private property;
    private resolvePath;
    private nodeCache;
    NodeCache: any;
    readonly Destroyed: boolean;
    readonly Parent: TreeNode;
    readonly Children: Map<string, TreeNode>;
    readonly Path: string;
    readonly Value: any;
    readonly Self: TreeNode;
    readonly Emitter: Emitter;
    Property: string;
    ParentKey: string;
    constructor(tree: Tree, parentNode: TreeNode, property: string, resolvePath: {
        (path: string): any;
    });
    OverwriteChildren(children: [string, TreeNode][]): void;
    UpdateParentKey(): void;
    EnsureChild(prop: string): TreeNode;
    Destroy(): void;
}
