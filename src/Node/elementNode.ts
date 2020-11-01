import { BoundNode, IBoundNode } from "./boundNode";
import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { Schedule, Thread } from "../Utils/thread";
import { FunctionOr, NodeRefEvents } from './boundNode.types';
import { ElementNodeFunctionParam, ElementChildrenFunction } from "./elementNode.types";
import { INodeRef, NodeRef } from "./nodeRef";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";

export interface IElementNode<T> extends IBoundNode {
    childrenFunc: {(data: T): string | INodeRef | INodeRef[]};
    nodesMap: Map<T, List<Array<INodeRef>>>;
    setData: boolean;
}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children: ElementChildrenFunction<T>) {
        var node = CreateNode(type, namespace, children);
        Init(node, nodeDef.data, nodeDef.props, nodeDef.attrs, nodeDef.on);
        return node;
    }

}

function CreateNode<T>(type: any, namespace: string, children: ElementChildrenFunction<T>) {
    var elemNode: IElementNode<T> = {
        node: NodeConfig.createNode(type, namespace),
        injector: Injector.Current() || new Injector(),
        parent: null,
        childNodes: new Set<INodeRef>(),
        destroyed: false,
        lastProperties: null,
        lastEvents: null,

        setProperties: false,
        setAttributes: false,
        setEvents: false,
        setData: false,
        nodesMap: new Map(),
        childrenFunc: children,
        destroyables: []
    };

    return elemNode;
}

const valueDefaultTrue = [true];
const valueDefault = [] as Array<any>;
function GetValue(childrenFunc: (data: any) => string | INodeRef | INodeRef[], dataScope: IObservableScope<any>) {
    return childrenFunc ? 
        dataScope ? ObservableScope.Value(dataScope) || valueDefault : 
            valueDefaultTrue : valueDefault;
}

function Init<T = any>(elementNode: IElementNode<T>, data: {(): T | Array<T> | Promise<Array<T>> | Promise<T> }, props: FunctionOr<{[name: string]: any}>, attrs: FunctionOr<{[name: string]: string}>, on: FunctionOr<NodeRefEvents>) {
    BoundNode.Init(elementNode, props, attrs, on);

    var childrenFunc = elementNode.childrenFunc;
    var dataScope = data && 
        ObservableScope.Create(data);
    
    ObservableScope.Watch(dataScope, function() { 
        SetData(elementNode, GetValue(childrenFunc, dataScope)); 
    });

    SetData(elementNode, GetValue(childrenFunc, dataScope), true);

    elementNode.destroyables.push({
        Destroy: function() {
            ObservableScope.Destroy(dataScope);
        }
    });
}

function SetData<T>(node: IElementNode<T>, value: T | T[], init = false) {
    Thread(function() {
        if(node.destroyed)
            return;
        
        var newNodesMap = new Map();
        var values = value || valueDefault;
        if(!Array.isArray(values))
            values = [values];
        
        var newNodesArrays = values.map(function(value, index) {
            var nodeArrayList = node.nodesMap.get(value);
            var nodes = nodeArrayList && nodeArrayList.Remove();
            if(nodeArrayList && nodeArrayList.Size === 0)
                node.nodesMap.delete(value);

            var newNodeArrayList = newNodesMap.get(value);
            if(!newNodeArrayList) {
                newNodeArrayList = new List<INodeRef[]>();
                newNodesMap.set(value, newNodeArrayList);
            }

            if(nodes)
                newNodeArrayList.Push(nodes);
            else {
                Schedule(function() {
                    if(node.destroyed || newNodesMap.size === 0)
                        return;

                    var newNodes: INodeRef[];
                    Injector.Scope(node.injector, function() {
                        newNodes = CreateNodeArray(node.childrenFunc, value);
                    });
                    newNodesMap.get(value).Push(newNodes);
                    if(newNodesArrays)
                        newNodesArrays[index] = newNodes;
                    else
                        nodes = newNodes;
                });
            }

            return nodes || null;
        });

        var detachNodes: Array<List<INodeRef[]>>;
        if(!init) {
            detachNodes = [];
            node.nodesMap.forEach(function(nodeArrayList) {
                var destroyNodes = nodeArrayList;
                detachNodes.push(nodeArrayList);
                destroyNodes.ForEach(nodes => {
                    for(var x=0; x<nodes.length; x++)
                        NodeRef.Destroy(nodes[x]);
                });
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

function DetachAndAddNodes(node: INodeRef, detachNodes: Array<List<INodeRef[]>>, newNodes: Array<Array<INodeRef>>) {
    for(var x=0; detachNodes && x<detachNodes.length; x++)
        detachNodes[x].ForEach(function(nodes) {
            for(var x=0; x<nodes.length; x++)
                NodeRef.DetachChild(node, nodes[x]);
        });
    
    var previousNode: INodeRef = null;
    for(var x=0; newNodes && x<newNodes.length; x++) {
        for(var y=0; y<newNodes[x].length; y++) {
            NodeRef.AddChildAfter(node, previousNode, newNodes[x][y]);
            previousNode = newNodes[x][y];
        }
    }
}

function CreateNodeArray<T>(childrenFunc: {(data: T): string | INodeRef | INodeRef[]}, value: any) {
    var newNodes = childrenFunc(value);
    if(typeof newNodes === "string") {
        var textNode = BoundNode.Create("text", null);
        BoundNode.Init(textNode, function() { 
            return { nodeValue: childrenFunc(value) }
        }, null, null);
        return [textNode];
    }

    if(Array.isArray(newNodes))
        return newNodes;

    return [newNodes];
}