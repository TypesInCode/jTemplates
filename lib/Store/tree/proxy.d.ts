import { TreeNode } from "./treeNode";
export declare enum IProxyType {
    Value = 0,
    Object = 1,
    Array = 2
}
export interface IProxy {
    ___type: IProxyType;
    ___storeProxy: boolean;
    ___node: TreeNode;
    toJSON(): any;
}
export declare namespace IProxy {
    function Type(proxy: IProxy): IProxyType;
    function ValueType(value: any): IProxyType;
    function Create(node: TreeNode, type: IProxyType): any;
}
