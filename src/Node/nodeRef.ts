import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { INodeRef, INodeRefBase, NodeRefTypes } from "./nodeRef.types";
import { IBoundNode } from "./boundNode.types";
import { IElementNode } from "./elementNode.types";
import { IComponentNode } from "./componentNode.types";
import { BoundNode } from "./boundNode";
import { ElementNode } from "./elementNode";
import { ComponentNode } from "./componentNode";

export enum NodeRefType {
    NodeRef,
    BoundNode,
    ElementNode,
    ComponentNode
}

export namespace NodeRef {
    
    export function Wrap(node: any) {
        var nodeRef = Create(null, null, NodeRefType.NodeRef);
        nodeRef.node = node;
        nodeRef.childNodes = new Set();
        return nodeRef as INodeRef;
    }

    export function Create(nodeType: any, namespace: string, type: NodeRefType) {
        switch(type) {
            case NodeRefType.NodeRef:
                return {
                    node: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.NodeRef,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    destroyables: []
                } as INodeRef;
            case NodeRefType.BoundNode:
                return {
                    node: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.BoundNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    destroyables: [],
                    lastProperties: null,
                    lastEvents: null,
                    setProperties: false,
                    setAttributes: false,
                    setEvents: false
                } as IBoundNode;
            case NodeRefType.ElementNode:
                return {
                    node: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.ElementNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    destroyables: [],
                    lastProperties: null,
                    lastEvents: null,
                    setProperties: false,
                    setAttributes: false,
                    setEvents: false,
                    childrenFunc: null,
                    nodesMap: null,
                    setData: false
                } as IElementNode<any>;
            case NodeRefType.ComponentNode:
                return {
                    node: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.ComponentNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    destroyables: [],
                    lastProperties: null,
                    lastEvents: null,
                    setProperties: false,
                    setAttributes: false,
                    setEvents: false,
                    component: null,
                    componentEvents: null
                } as IComponentNode<any, any, any>;
        }
    }

    export function Init(nodeRef: NodeRefTypes) {
        if(nodeRef.node)
            return;

        nodeRef.node = NodeConfig.createNode(nodeRef.nodeType, nodeRef.nodeNamespace);
        nodeRef.childNodes = new Set();

        switch(nodeRef.type) {
            case NodeRefType.BoundNode:
                BoundNode.Init(nodeRef);
                break;
            case NodeRefType.ElementNode:
                ElementNode.Init(nodeRef);
                break;
            case NodeRefType.ComponentNode:
                ComponentNode.Init(nodeRef);
                break;
        }
    }

    export function InitAll(nodeRefs: Array<NodeRefTypes>) {
        for(var x=0; x<nodeRefs.length; x++)
            Init(nodeRefs[x]);
    }

    export function AddChild(node: INodeRefBase, child: INodeRefBase) {
        child.parent = node;
        node.childNodes.add(child);
        NodeConfig.addChild(node.node, child.node);
    }

    export function AddChildAfter(node: INodeRefBase, currentChild: INodeRefBase, newChild: INodeRefBase) {
        if(currentChild && !node.childNodes.has(currentChild))
            throw "currentChild is not valid";

        newChild.parent = node;
        node.childNodes.add(newChild);
        NodeConfig.addChildAfter(node.node, currentChild && currentChild.node, newChild.node);
    }

    export function DetachChild(node: INodeRefBase, child: INodeRefBase) {
        if(node.childNodes.has(child)) {
            node.childNodes.delete(child);
            NodeConfig.removeChild(node.node, child.node);
            child.parent = null;
        }
    }

    export function Destroy(node: INodeRefBase) {
        if(node.destroyed)
            return;

        node.destroyed = true;
        node.childNodes.forEach(Destroy);
        for(let x=0; x<node.destroyables.length; x++)
            node.destroyables[x]?.Destroy();
    }

    export function DestroyAll(nodes: Array<INodeRefBase>) {
        for(var x=0; x<nodes.length; x++)
            Destroy(nodes[x]);
    }

}