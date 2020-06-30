import { BoundNode } from "./boundNode";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Schedule, Thread } from "../Utils/thread";
import { ElementNodeDefinition, ElementNodeFunctionParam, ElementChildrenFunction } from "./elementNode.types";

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T): string | NodeRef | NodeRef[]};
    private nodesMap: Map<any, List<Array<NodeRef>>>;

    private setData: boolean;
    private dataBound: {(): void};
    private destroyData: boolean;

    private dataScope: ObservableScopeAsync<any>;
    
    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.setData = false;
        this.nodesMap = new Map();
        this.childrenFunc = nodeDef.children;

        if(nodeDef.data) {
            this.dataScope = this.Injector.Get(nodeDef.data);
            if(!this.dataScope) {
                this.destroyData = true;
                this.dataScope = new ObservableScopeAsync<any>(nodeDef.data);
            }
            this.dataBound = () => ElementNode.ScheduleSetData(this);
            this.dataScope.Watch(this.dataBound);
        }

        ElementNode.SetData(this, true);
    }

    public Destroy() {
        super.Destroy();
        if(this.dataScope) {
            if(this.destroyData)
                this.dataScope.Destroy();
            else
                this.dataScope.Unwatch(this.dataBound);
        }
    }

    private static ScheduleSetData<T>(node: ElementNode<T>) {
        if(node.setData)
            return;

        node.setData = true;
        NodeConfig.scheduleUpdate(() => {
            node.setData = false;
            if(node.Destroyed)
                return;
            
            ElementNode.SetData(node);
        });
    }

    private static SetData<T>(node: ElementNode<T>, init = false) {
        Thread(() => {
            var newNodesMap = new Map();
            var values: Array<T> = node.childrenFunc ? 
                node.dataScope ? 
                    node.dataScope.Value : 
                    [true] : [];
            
            if(!values)
                values = [];
            else if(!Array.isArray(values))
                values = [values];
            
            var newNodesArrays = values.map((value, index) => {
                var nodeArrayList = node.nodesMap.get(value);
                var nodes = nodeArrayList && nodeArrayList.Remove();
                if(nodeArrayList && nodeArrayList.Size === 0)
                    node.nodesMap.delete(value);

                var newNodeArrayList = newNodesMap.get(value);
                if(!newNodeArrayList) {
                    newNodeArrayList = new List<NodeRef[]>();
                    newNodesMap.set(value, newNodeArrayList);
                }

                if(nodes)
                    newNodeArrayList.Push(nodes);
                else {
                    Schedule(() => {
                        if(node.Destroyed || newNodesMap.size === 0)
                            return;

                        var newNodes = ElementNode.CreateNodeArray(node, value);
                        newNodesMap.get(value).Push(newNodes);
                        if(newNodesArrays)
                            newNodesArrays[index] = newNodes;
                        else
                            nodes = newNodes;
                    });
                }

                return nodes || null;
            });

            var detachNodes: Array<List<NodeRef[]>>;
            if(!init) {
                detachNodes = [];
                node.nodesMap.forEach(nodeArrayList => {
                    var destroyNodes = nodeArrayList;
                    detachNodes.push(nodeArrayList);
                    destroyNodes.ForEach(nodes => {
                        for(var x=0; x<nodes.length; x++)
                            nodes[x].Destroy();
                    });
                });
            }

            node.nodesMap.clear();
            node.nodesMap = newNodesMap;
            Thread(() => {
                if(node.Destroyed)
                    return;

                if(init)
                    ElementNode.DetachAndAddNodes(node, detachNodes, newNodesMap.size > 0 && newNodesArrays);                
                else
                    NodeConfig.scheduleUpdate(() => {
                        if(node.Destroyed)
                            return;
                        
                        ElementNode.DetachAndAddNodes(node, detachNodes, newNodesMap.size > 0 && newNodesArrays);
                    });
            });
        });
    }

    private static DetachAndAddNodes(node: NodeRef, detachNodes: Array<List<NodeRef[]>>, newNodes: Array<Array<NodeRef>>) {
        for(var x=0; detachNodes && x<detachNodes.length; x++)
            detachNodes[x].ForEach(nodes => {
                for(var x=0; x<nodes.length; x++)
                    nodes[x].Detach();
            });
        
        var previousNode: NodeRef = null;
        for(var x=0; newNodes && x<newNodes.length; x++) {
            for(var y=0; y<newNodes[x].length; y++) {
                node.AddChildAfter(previousNode, newNodes[x][y]);
                previousNode = newNodes[x][y];
            }
        }
    }

    private static CreateNodeArray<T>(node: ElementNode<T>, value: any) {
        var nodes: NodeRef[] = null;
        Injector.Scope(node.Injector, () => {
            var newNodes = node.childrenFunc(value);
            if(typeof newNodes === "string")
                newNodes = [BoundNode.Create("text", null, { props: () => ({ nodeValue: node.childrenFunc(value) }) })];

            nodes = newNodes as Array<NodeRef>;
            if(!Array.isArray(nodes))
                nodes = [nodes];
        });

        return nodes;
    }
}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>) {
        var def = {
            type: type,
            namespace: namespace,
            immediate: nodeDef.immediate,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on,
            data: nodeDef.data,
            children: children
        } as ElementNodeDefinition<any>;

        var elem = new ElementNode<T>(def);
        return elem;
    }

}