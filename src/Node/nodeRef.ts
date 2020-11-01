import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { IDestroyable } from "../Utils/utils.types";

export interface INodeRef {
    node: any;
    injector: Injector;
    parent: INodeRef;
    childNodes: Set<INodeRef>;
    destroyed: boolean;
    destroyables: IDestroyable[];
}

export namespace NodeRef {

    export function Create(node: any): INodeRef {
        return {
            node: node,
            injector: Injector.Current() || new Injector(),
            parent: null,
            childNodes: new Set<INodeRef>(),
            destroyed: false,
            destroyables: []
        };
    }

    export function AddChild(node: INodeRef, child: INodeRef) {
        child.parent = node;
        node.childNodes.add(child);
        NodeConfig.addChild(node.node, child.node);
    }

    export function AddChildAfter(node: INodeRef, currentChild: INodeRef, newChild: INodeRef) {
        if(currentChild && !node.childNodes.has(currentChild))
            throw "currentChild is not valid";

        newChild.parent = node;
        node.childNodes.add(newChild);
        NodeConfig.addChildAfter(node.node, currentChild && currentChild.node, newChild.node);
    }

    export function DetachChild(node: INodeRef, child: INodeRef) {
        if(node.childNodes.has(child)) {
            node.childNodes.delete(child);
            NodeConfig.removeChild(node.node, child.node);
            child.parent = null;
        }
    }

    export function Destroy(node: INodeRef) {
        if(node.destroyed)
            return;

        node.destroyed = true;
        node.childNodes.forEach(Destroy);
        node.destroyables.forEach(d => d && d.Destroy());
    }

}