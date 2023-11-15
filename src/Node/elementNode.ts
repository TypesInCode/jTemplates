import { BoundNode } from "./boundNode";
import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { IList, List } from "../Utils/list";
import { Schedule, Synch, Thread } from "../Utils/thread";
import { ElementNodeFunctionParam, ElementChildrenFunction, IElementNode, IElementNodeBase } from "./elementNode.types";
import { NodeRef, NodeRefType } from "./nodeRef";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";
import { INodeRefBase, NodeRefTypes } from "./nodeRef.types";
import { IBoundNode } from "./boundNode.types";

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
            NodeRef.InitAll(nodes);

            Thread(function() {
                if(node.destroyed)
                    return;

                DetachAndAddNodes(node, [], [nodes]);
            });
        }
    });
}

function SetData<T>(node: IElementNodeBase<T>, values: T[], init = false) {
    Synch(function () {
        const newNodesMap = new Map<T, IList<Array<NodeRefTypes>>>();
        const newNodesArrays: NodeRefTypes[][] = new Array(values.length);
        for(let x=0; x<values.length; x++) {
            const value = values[x];
            let nodes: NodeRefTypes[];
            if(node.nodesMap) {
                let nodeArrayList = node.nodesMap.get(value);
                nodes = nodeArrayList && List.Remove(nodeArrayList);
            }

            let newNodeArrayList = newNodesMap.get(value);
            if(!newNodeArrayList) {
                newNodeArrayList = List.Create<Array<NodeRefTypes>>();
                newNodesMap.set(value, newNodeArrayList);
            }

            if(!nodes) {
                nodes = Injector.Scope(node.injector, CreateNodeArray, node.childrenFunc, value);
                Schedule(function() {
                    if(node.destroyed || newNodesMap.size === 0)
                        return;

                    NodeRef.InitAll(nodes);
                    List.Push(newNodeArrayList, nodes);
                });
            }
            else
                List.Push(newNodeArrayList, nodes);
            
            newNodesArrays[x] = nodes;
        }

        var detachNodes: Array<IList<INodeRefBase[]>> = [];
        if(node.nodesMap) {
            for(var nodeArrayList of node.nodesMap.values())
                nodeArrayList.size > 0 && detachNodes.push(DestroyNodeArrayList(nodeArrayList));
                
            node.nodesMap.clear();
        }

        node.nodesMap = newNodesMap;
        Thread(function() {
            if(node.destroyed)
                return;

            if(init)
                DetachAndAddNodes(node, detachNodes, newNodesMap.size > 0 && newNodesArrays);                
            else
                NodeConfig.scheduleUpdate(function() {
                    if(node.destroyed)
                        return;
                    
                    DetachAndAddNodes(node, detachNodes, newNodesMap.size > 0 && newNodesArrays);
                });
        });
    });
}

function DetachAndAddNodes(node: INodeRefBase, detachNodes: Array<IList<INodeRefBase[]>>, newNodes: Array<Array<INodeRefBase>>) {
    for(var x=0; x<detachNodes.length; x++)
        List.ForEach(detachNodes[x], function(nodes) {
            for(var x=0; x<nodes.length; x++)
                NodeRef.DetachChild(node, nodes[x]);
        });
    
    var previousNode: INodeRefBase = null;
    for(var x=0; newNodes && x<newNodes.length; x++) {
        for(var y=0; y<newNodes[x].length; y++) {
            NodeRef.AddChildAfter(node, previousNode, newNodes[x][y]);
            previousNode = newNodes[x][y];
        }
    }
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

function DestroyNodeArrayList(nodeArrayList: IList<NodeRefTypes[]>) {
    List.ForEach(nodeArrayList, NodeRef.DestroyAll);
    return nodeArrayList;
}