import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { INodeRef, ElementNodeRefTypes, AllNodeRefTypes } from "./nodeRef.types";
import { IBoundNode } from "./boundNode.types";
import { IElementDataNode, IElementNode } from "./elementNode.types";
import { IComponentNode } from "./componentNode.types";
import { BoundNode } from "./boundNode";
import { ElementNode } from "./elementNode";
import { ComponentNode } from "./componentNode";
import { IList, List } from "../Utils/list";
import { ObservableScope } from "../Store";
import { ITextNode } from "./textNode.types";
import { DOMNodeConfig } from "../DOM/domNodeConfig";

export enum NodeRefType {
    NodeRef,
    BoundNode,
    ElementNode,
    ComponentNode,
    TextNode
}

export namespace NodeRef {
    
    export function Wrap(node: any) {
        const nodeRef = Create(null, null, NodeRefType.BoundNode) as INodeRef;
        nodeRef.node = node;
        nodeRef.childNodes = [];
        return nodeRef;
    }

    export function Create(nodeType: any, namespace: string, type: NodeRefType) {
        switch(type) {
            case NodeRefType.TextNode:
                return {
                    type: NodeRefType.TextNode,
                    parent: null,
                    node: null,
                    value: nodeType as string
                } as ITextNode;
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
                    children: null,
                    childrenArray: null,
                    nodeList: null,
                    setData: false,
                    setText: false,
                    scopes: null,
                    destroyNodeList: List.Create()
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

    export function Init(nodeRef: AllNodeRefTypes) {
        if(nodeRef.type === NodeRefType.TextNode || nodeRef.node)
            return;

        nodeRef.node = NodeConfig.createNode(nodeRef.nodeType, nodeRef.nodeNamespace);
        nodeRef.childNodes = nodeRef.nodeType !== NodeRefType.TextNode ? [] : null;

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

    function AddChildToNode(parentNode: ElementNodeRefTypes, child: AllNodeRefTypes) {
        switch(parentNode.type) {
            case NodeRefType.ElementNode:
                parentNode.childNodes.add(child);
                break;
            case NodeRefType.ComponentNode:
            case NodeRefType.BoundNode:
                parentNode.childNodes.push(child);
                break;
            default:
                throw "Unable to add child node to node";
        }
    }

    export function InitAll(parentNode: ElementNodeRefTypes, nodeRefs: Array<AllNodeRefTypes>) {
        for(var x=0; x<nodeRefs.length; x++) {
            nodeRefs[x].parent = parentNode;
            AddChildToNode(parentNode, nodeRefs[x]);
            Init(nodeRefs[x]);
        }
    }

    export function AddChild(node: ElementNodeRefTypes, child: AllNodeRefTypes) {
        child.parent = node;
        AddChildToNode(node, child);
        NodeConfig.addChild(node.node, child.node);
    }

    export function AddChildAfter(node: ElementNodeRefTypes, currentChild: AllNodeRefTypes, newChild: AllNodeRefTypes) {
        if(currentChild && currentChild.parent !== node)
            throw "currentChild is not valid";

        newChild.parent = node;
        AddChildToNode(node, newChild);
        NodeConfig.addChildAfter(node.node, currentChild && currentChild.node, newChild.node);
    }

    export function AddChildBefore(node: ElementNodeRefTypes, currentChild: AllNodeRefTypes, newChild: AllNodeRefTypes) {
        if(currentChild && currentChild.parent !== node)
            throw "currentChild is not valid";

        newChild.parent = node;
        AddChildToNode(node, newChild);
        NodeConfig.addChildBefore(node.node, currentChild && currentChild.node, newChild.node);
    }

    export function ReconcileChildren(node: ElementNodeRefTypes, nextChildren: IList<IElementDataNode<unknown>>) {
        const rootNode = node.node;

        if(nextChildren.size === 0) {
            NodeConfig.replaceChildren(rootNode, []);
            return;
        }

        let priorNode: any;
        let insert = false;
        let remove = false;

        for(let curDataNode = nextChildren.head; curDataNode !== null; curDataNode = curDataNode.next) {
            for(let x=0; x<curDataNode.data.nodes.length; x++) {
                const virtualNode = curDataNode.data.nodes[x];

                const actualNode = priorNode ? NodeConfig.getNextSibling(priorNode) : NodeConfig.getFirstChild(rootNode);

                if(virtualNode.type === NodeRefType.TextNode && virtualNode.node === null) {
                    if(DOMNodeConfig.isTextNode(actualNode)) {
                        DOMNodeConfig.setText(actualNode, virtualNode.value);
                        virtualNode.node = actualNode;
                    }
                    else
                        virtualNode.node = DOMNodeConfig.createTextNode(virtualNode.value);
                }

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
        }
       
        let lastChild = NodeConfig.getLastChild(rootNode);
        while(priorNode && priorNode !== lastChild) {
            NodeConfig.removeChild(rootNode, lastChild);
            lastChild = NodeConfig.getLastChild(rootNode);
        }
    }

    export function DetachChild(node: ElementNodeRefTypes, child: AllNodeRefTypes) {
        if(node.type === NodeRefType.ElementNode && node.childNodes.delete(child))
            child.parent = null;        
    }

    export function Destroy(node: AllNodeRefTypes) {
        if(node.type === NodeRefType.TextNode || node.destroyed)
            return;

        node.destroyed = true;
        if(Array.isArray(node.childNodes))
            for(let x=0; x<node.childNodes.length; x++)
                Destroy(node.childNodes[x] as ElementNodeRefTypes);
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

    export function DestroyAll(nodes: Array<AllNodeRefTypes>) {
        for(let x=0; x<nodes.length; x++)
            Destroy(nodes[x]);
    }

}