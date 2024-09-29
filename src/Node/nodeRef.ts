import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { INodeRef, INodeRefBase, NodeRefTypes } from "./nodeRef.types";
import { IBoundNode, IBoundNodeBase } from "./boundNode.types";
import { IElementDataNode, IElementNode } from "./elementNode.types";
import { IComponentNode } from "./componentNode.types";
import { BoundNode } from "./boundNode";
import { ElementNode } from "./elementNode";
import { ComponentNode } from "./componentNode";
import { IList } from "../Utils/list";
import { ObservableScope } from "../Store";

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
                    destroyed: false
                } as INodeRef;
            case NodeRefType.BoundNode:
                return {
                    node: null,
                    nodeDef: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.BoundNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    lastEvents: null,
                    setProperties: false,
                    assignProperties: null,
                    assignEvents: null,
                    assignText: null,
                    setAttributes: false,
                    setEvents: false,
                    setText: false,
                    scopes: null
                } as IBoundNode;
            case NodeRefType.ElementNode:
                return {
                    node: null,
                    nodeDef: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.ElementNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    lastEvents: null,
                    setProperties: false,
                    assignProperties: null,
                    assignEvents: null,
                    assignText: null,
                    setAttributes: false,
                    setEvents: false,
                    childrenFunc: null,
                    nodeList: null,
                    setData: false,
                    setText: false,
                    scopes: null
                } as IElementNode<any>;
            case NodeRefType.ComponentNode:
                return {
                    node: null,
                    nodeDef: null,
                    nodeType: nodeType,
                    nodeNamespace: namespace,
                    type: NodeRefType.ComponentNode,
                    injector: Injector.Current() || new Injector(),
                    parent: null,
                    childNodes: null,
                    destroyed: false,
                    setProperties: false,
                    assignProperties: null,
                    assignEvents: null,
                    setAttributes: false,
                    setEvents: false,
                    component: null,
                    componentEvents: null,
                    scopes: null
                } as IComponentNode<any, any, any>;
        }
    }

    export function Init(nodeRef: NodeRefTypes) {
        if(nodeRef.node)
            return;

        nodeRef.node = nodeRef.nodeType === 'text' ? NodeConfig.createTextNode() : NodeConfig.createNode(nodeRef.nodeType, nodeRef.nodeNamespace);
        nodeRef.childNodes = nodeRef.nodeType !== 'text' ? [] : null;

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

    function AddChildToNode(parentNode: INodeRefBase, child: INodeRefBase) {
        if(Array.isArray(parentNode.childNodes))
            parentNode.childNodes.push(child);
        else
            parentNode.childNodes.add(child);
    }

    export function InitAll(parentNode: NodeRefTypes, nodeRefs: Array<NodeRefTypes>) {
        for(var x=0; x<nodeRefs.length; x++) {
            nodeRefs[x].parent = parentNode;
            AddChildToNode(parentNode, nodeRefs[x]);
            Init(nodeRefs[x]);
        }
    }

    export function AddChild(node: INodeRefBase, child: INodeRefBase) {
        child.parent = node;
        AddChildToNode(node, child);
        NodeConfig.addChild(node.node, child.node);
    }

    export function AddChildAfter(node: INodeRefBase, currentChild: INodeRefBase, newChild: INodeRefBase) {
        if(currentChild && currentChild.parent !== node)
            throw "currentChild is not valid";

        newChild.parent = node;
        AddChildToNode(node, newChild);
        NodeConfig.addChildAfter(node.node, currentChild && currentChild.node, newChild.node);
    }

    export function ReconcileChildren(node: INodeRefBase, nextChildren: IList<IElementDataNode<unknown>>) {
        const rootNode = node.node;

        if(nextChildren.size === 0) {
            NodeConfig.replaceChildren(rootNode, []);
            return;
        }

        let priorNode: any;
        let curDataNode = nextChildren?.head;
        let insert = false;
        let remove = false;

        while(curDataNode) {
            for(let x=0; x<curDataNode.data.nodes.length; x++) {
                const actualNode = priorNode ? NodeConfig.getNextSibling(priorNode) : NodeConfig.getFirstChild(rootNode);
                const virtualNode = curDataNode.data.nodes[x];
                const expectedNode = virtualNode.node;

                if(actualNode !== expectedNode) {
                    NodeConfig.addChildBefore(rootNode, actualNode, expectedNode);
                    !remove && insert && actualNode && NodeConfig.removeChild(rootNode, actualNode);
                    remove = insert;
                    insert = true;
                }
                else {
                    insert = false;
                    remove = false;
                }

                priorNode = expectedNode;
            }

            curDataNode = curDataNode.next;
        }
       
        let lastChild = NodeConfig.getLastChild(rootNode);
        while(priorNode && priorNode !== lastChild) {
            NodeConfig.removeChild(rootNode, lastChild);
            lastChild = NodeConfig.getLastChild(rootNode);
        }
    }

    export function DetachChild(node: INodeRefBase, child: INodeRefBase) {
        if(!Array.isArray(node.childNodes) && node.childNodes.delete(child)) {
            NodeConfig.removeChild(node.node, child.node);
            child.parent = null;
        }
    }

    export function Destroy(node: NodeRefTypes) {
        if(node.destroyed)
            return;

        node.destroyed = true;
        if(Array.isArray(node.childNodes))
            for(let x=0; x<node.childNodes.length; x++)
                Destroy(node.childNodes[x] as NodeRefTypes);
        else
            node.childNodes?.forEach(Destroy);

        switch(node.type) {
            case NodeRefType.ComponentNode:
                node.component?.Destroy();
            case NodeRefType.BoundNode:
                node.assignEvents?.(null);
            case NodeRefType.ElementNode:
                for(let x=0; node.scopes && x<node.scopes.length; x++)
                    ObservableScope.Destroy(node.scopes[x]);
        }

        node.node = null;
    }

    export function DestroyAll(nodes: Array<INodeRefBase>) {
        for(let x=0; x<nodes.length; x++)
            Destroy(nodes[x] as INodeRef);
    }

}