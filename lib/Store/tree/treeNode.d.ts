import Emitter from "../../Utils/emitter";
import { Tree } from "./tree";
import { IProxy } from "./proxy";
export declare class TreeNode {
    private tree;
    private parentNode;
    private children;
    private emitter;
    private property;
    private resolvePath;
    private proxy;
    private value;
    private proxyArray;
    readonly Proxy: IProxy;
    readonly ProxyArray: Array<any>;
    readonly Children: Map<string, TreeNode>;
    readonly Path: string;
    readonly StoreValue: any;
    readonly Value: any;
    readonly Self: TreeNode;
    readonly Emitter: Emitter;
    Property: string;
    constructor(tree: Tree, parentNode: TreeNode, property: string, resolvePath: {
        (path: string): any;
    });
    UpdateCachedArray(index: string, value: any): void;
    ClearCachedArray(): void;
    EnsureChild(prop: string): TreeNode;
    Destroy(): void;
    private UpdateProxyArray;
}
