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
        elementNode.nodesMap = new Map();
        var nodeDef = elementNode.nodeDef;
        var childrenFunc = elementNode.childrenFunc;
        var dataScope = nodeDef.data && 
            ObservableScope.Create(nodeDef.data);
        
        ObservableScope.Watch(dataScope, function() { 
            ScheduleSetData(elementNode, dataScope);
        });

        SetData(elementNode, GetValue(childrenFunc, dataScope), true);

        elementNode.destroyables.push({
            Destroy: function() {
                ObservableScope.Destroy(dataScope);
            }
        });

        BoundNode.Init(elementNode);
    }

}

const valueDefaultTrue = [true];
const valueDefault = [] as Array<any>;
function GetValue(childrenFunc: ElementChildrenFunction<any>, dataScope: IObservableScope<any>) {
    return childrenFunc ? 
        dataScope ? ObservableScope.Value(dataScope) || valueDefault : 
            valueDefaultTrue : valueDefault;
}

function ScheduleSetData<T>(node: IElementNodeBase<T>, scope: IObservableScope<any>) {
    if(node.setData)
        return;

    node.setData = true;
    NodeConfig.scheduleUpdate(function() {
        node.setData = false;
        if(node.destroyed)
            return;
        
        SetData(node, GetValue(node.childrenFunc, scope));
    });
}

function SetData<T>(node: IElementNodeBase<T>, value: T | T[], init = false) {
    Synch(function () {
        var newNodesMap = new Map<T, IList<Array<NodeRefTypes>>>();
        var values = value || valueDefault;
        if(!Array.isArray(values))
            values = [values];
        
        var newNodesArrays = values.map(function(value) {
            var nodeArrayList = node.nodesMap.get(value);
            var nodes = nodeArrayList && List.Remove(nodeArrayList);
            if(nodeArrayList && nodeArrayList.size === 0)
                node.nodesMap.delete(value);

            var newNodeArrayList = newNodesMap.get(value);
            if(!newNodeArrayList) {
                newNodeArrayList = List.Create<Array<NodeRefTypes>>();
                newNodesMap.set(value, newNodeArrayList);
            }

            if(!nodes) {
                Injector.Scope(node.injector, function() {
                    nodes = CreateNodeArray(node.childrenFunc, value);
                });
                Schedule(function() {
                    if(node.destroyed || newNodesMap.size === 0)
                        return;

                    NodeRef.InitAll(nodes);
                    List.Push(newNodeArrayList, nodes);
                });
            }
            else
                List.Push(newNodeArrayList, nodes);
            
            return nodes;
        });

        var detachNodes: Array<IList<INodeRefBase[]>>;
        if(!init) {
            detachNodes = [];
            node.nodesMap.forEach(function(nodeArrayList) {
                var destroyNodes = nodeArrayList;
                detachNodes.push(nodeArrayList);
                List.ForEach(destroyNodes, NodeRef.DestroyAll);
            });
        }

        node.nodesMap.clear();
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
    for(var x=0; detachNodes && x<detachNodes.length; x++)
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