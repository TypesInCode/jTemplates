import { TreeNode } from "./treeNode";
export declare class Tree {
    private root;
    private id;
    constructor(resolvePath: {
        (path: string): any;
    });
    GetNode(path: string, ensure?: boolean): TreeNode;
    GetIdNode(id: string): TreeNode;
    Destroy(): void;
}
