import { Injector } from "../Utils/injector";
import { IDestroyable } from "../Utils/utils.types";
import { IBoundNode } from "./boundNode.types";
import { IComponentNode } from "./componentNode.types";
import { IElementNode } from "./elementNode.types";
import { NodeRefType } from "./nodeRef";

export interface INodeRefBase {
    type: NodeRefType;
    node: any;
    nodeType: any;
    nodeNamespace: string;
    injector: Injector;
    parent: INodeRefBase;
    childNodes: INodeRefBase[] | Set<INodeRefBase>;
    destroyed: boolean;
    // destroyables: IDestroyable[];
}

export interface INodeRef extends INodeRefBase {
    type: NodeRefType.NodeRef;
}

export type NodeRefTypes = INodeRef | IBoundNode | IElementNode<any> | IComponentNode<any, any, any>;