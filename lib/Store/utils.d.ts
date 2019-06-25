import { TreeNode } from "./tree/treeNode";
import { StoreReader } from "./store/storeReader";
export declare function IsValue(value: any): boolean;
export declare function CreateProxy(node: TreeNode, reader: StoreReader<any>): any;
export declare function CreateProxyArray(node: TreeNode, reader: StoreReader<any>): any;
export declare function CreateCopy<O>(source: O): O;
