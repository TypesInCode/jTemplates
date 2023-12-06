import { IObservableScope, ObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { IList, INode, List } from "../Utils/list";
import { Schedule, Synch, Thread } from "../Utils/thread";
import { BoundNode } from "./boundNode";
import { IBoundNode } from "./boundNode.types";
import { ElementChildrenFunction, ElementNodeFunctionParam, IElementDataNode, IElementNode, IElementNodeBase } from "./elementNode.types";
import { NodeConfig } from "./nodeConfig";
import { NodeRef, NodeRefType } from "./nodeRef";
import { NodeRefTypes } from "./nodeRef.types";

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children: ElementChildrenFunction<T>) {
        var elemNode = NodeRef.Create(type, namespace, NodeRefType.ElementNode) as IElementNode<T>;
        elemNode.nodeDef = nodeDef;
        elemNode.childrenFunc = children;
        return elemNode;
    }

    export function Init<T>(elementNode: IElementNodeBase<T>) {
        if(elementNode.childrenFunc) {
            var nodeDef = elementNode.nodeDef;

            if(nodeDef.data) {
                const dataScope = ObservableScope.Create(nodeDef.data);
                ObservableScope.Watch(dataScope, function() { 
                    ScheduleSetData(elementNode, dataScope);
                });

                SetData(elementNode, GetValue(dataScope), true);

                elementNode.destroyables.push({
                    Destroy: function() {
                        ObservableScope.Destroy(dataScope);
                    }
                });
            }
            else
                SetDefaultData(elementNode);
        }

        BoundNode.Init(elementNode);
    }

}

const valueDefault = [] as Array<any>;
function GetValue(dataScope: IObservableScope<any>): any[] {
    var value = ObservableScope.Value(dataScope);
    if(!value)
        return valueDefault;

    if(!Array.isArray(value))
        value = [value];

    return value;
}

function ScheduleSetData<T>(node: IElementNodeBase<T>, scope: IObservableScope<any>) {
    if(node.setData)
        return;

    node.setData = true;
    NodeConfig.scheduleUpdate(function() {
        node.setData = false;
        if(node.destroyed)
            return;
        
        SetData(node, GetValue(scope));
    });
}

function SetDefaultData<T>(node: IElementNodeBase<T>) {
    Synch(function() {
        const nodes = Injector.Scope(node.injector, CreateNodeArray, node.childrenFunc, true);

        if(nodes.length > 0) {
            NodeRef.InitAll(node as IElementNode<T>, nodes);

            Thread(function() {
                if(node.destroyed)
                    return;

                const defaultNodeList = List.Create<IElementDataNode<T>>();
                List.Add(defaultNodeList, {
                    value: null,
                    init: true,
                    nodes
                });
                NodeRef.ReconcileChildren(node, defaultNodeList);
            });
        }
    });
}

function GetDataValue<T>(data: IElementDataNode<T>) {
    return data.value;
}

function ReconcileNodeData<T>(node: IElementNodeBase<T>, values: T[]) {
    const nextNodeList = List.Create<IElementDataNode<T>>();
    const initNodeList = List.Create<IElementDataNode<T>>();
    const currentNodeList = node.nodeList;
    const nodeMap = currentNodeList && List.ToNodeMap(currentNodeList, GetDataValue);

    for(let x=0; x<values.length; x++) {
        let curNode: INode<IElementDataNode<T>>;

        if(nodeMap) {
            const nodeArr = nodeMap.get(values[x]);
            if(nodeArr) {
                let y=nodeArr.length - 1;
                for(; y >= 0 && !curNode; y--) {
                    curNode = nodeArr[y];
                    nodeArr[y] = null;
                }
            }
        }

        if(curNode) {
            List.RemoveNode(currentNodeList, curNode);
            List.AddNode(nextNodeList, curNode);
            if(!curNode.data.init)
                List.Add(initNodeList, curNode.data);
        }
        else {
            curNode = List.Add(nextNodeList, {
                value: values[x],
                init: false,
                nodes: Injector.Scope(node.injector, CreateNodeArray, node.childrenFunc, values[x])
            });
            List.Add(initNodeList, curNode.data);
        }
    }

    let curNode = initNodeList.head;
    while(curNode) {
        const data = curNode.data;
        Schedule(function() {
            if(node.destroyed || nextNodeList.size === 0)
                return;
            
            NodeRef.InitAll(node as IElementNode<T>, data.nodes);
            data.init = true;
        });
        curNode = curNode.next;
    }

    if(currentNodeList) {
        let curDetach = currentNodeList.head;
        while(curDetach) {
            NodeRef.DestroyAll(curDetach.data.nodes);
            for(let x=0; x<curDetach.data.nodes.length; x++)
                node.childNodes.delete(curDetach.data.nodes[x]);

            curDetach = curDetach.next;
        }
        List.Clear(currentNodeList);
    }

    /* let curAttach = nextNodeList.head;
    while(curAttach) {
        for(let x=0; x<curAttach.data.nodes.length; x++)
            node.childNodes.add(curAttach.data.nodes[x]);

        curAttach = curAttach.next;
    } */

    node.nodeList = nextNodeList;
}

function SetData<T>(node: IElementNodeBase<T>, values: T[], init = false) {
    Synch(function() {
        ReconcileNodeData(node, values);

        const attachNodes = node.nodeList;
        const startSize = attachNodes.size;
        Thread(function() {
            if(node.destroyed)
                return;

            if(init)
                NodeRef.ReconcileChildren(node, attachNodes);              
            else
                NodeConfig.scheduleUpdate(function() {
                    if(node.destroyed || attachNodes.size !== startSize)
                        return;
                    
                    NodeRef.ReconcileChildren(node, attachNodes);
                });
        });
    });
}

function CreateNodeArray<T>(childrenFunc: {(data: T): string | NodeRefTypes | NodeRefTypes[]}, value: any): NodeRefTypes[] {
    var newNodes = childrenFunc(value);
    if(typeof newNodes === "string") {
        var textNode = NodeRef.Create("text", null, NodeRefType.BoundNode) as IBoundNode;
        textNode.nodeDef = { 
            props: function () { 
                return { nodeValue: childrenFunc(value) };
            }
        };
        return [textNode];
    }

    if(Array.isArray(newNodes))
        return newNodes;

    return [newNodes];
}