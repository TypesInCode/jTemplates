import { BoundNode } from "./boundNode";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Schedule, Thread } from "../Utils/thread";
import { ElementNodeDefinition, ElementNodeFunctionParam, ElementChildrenFunction } from "./elementNode.d";

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T): string | NodeRef | NodeRef[]};
    private nodesMap: Map<any, List<Array<NodeRef>>>;

    private setData: boolean;
    private dataBound: {(): T[]};
    private destroyData: boolean;

    private dataScope: ObservableScopeAsync<any>;

    protected get NodeDef(): ElementNodeDefinition<T> {
        return super.NodeDef;
    }

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.setData = false;
        this.nodesMap = new Map();
        this.childrenFunc = nodeDef.children;
    }

    public Init() {
        super.Init();

        if(this.NodeDef.data) {
            this.dataScope = this.Injector.Get(this.NodeDef.data);
            if(!this.dataScope) {
                this.destroyData = true;
                this.dataScope = new ObservableScopeAsync<any>(this.NodeDef.data);
            }
            this.dataBound = this.ScheduleSetData.bind(this);
            this.dataScope.Watch(this.dataBound);
        }

        this.SetData(true);
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

    private ScheduleSetData() {
        if(this.setData)
            return;

        this.setData = true;
        NodeConfig.scheduleUpdate(() => {
            this.setData = false;
            if(this.Destroyed)
                return;
            
            this.SetData();
        });
    }

    private SetData(init = false) {
        Thread(() => {
            var newNodesMap = new Map();
            var values: Array<T> = this.childrenFunc ? 
                this.dataScope ? 
                    this.dataScope.Value : 
                    [true] : [];
            
            if(!values)
                values = [];
            else if(!Array.isArray(values))
                values = [values];
            
            var newNodesArrays = values.map((value, index) => {
                var nodeArrayList = this.nodesMap.get(value);
                var nodes = nodeArrayList && nodeArrayList.Remove();
                if(nodeArrayList && nodeArrayList.Size === 0)
                    this.nodesMap.delete(value);

                var newNodeArrayList = newNodesMap.get(value);
                if(!newNodeArrayList) {
                    newNodeArrayList = new List<NodeRef[]>();
                    newNodesMap.set(value, newNodeArrayList);
                }

                if(nodes)
                    newNodeArrayList.Push(nodes);
                else {
                    Schedule(() => {
                        if(this.Destroyed || newNodesMap.size === 0)
                            return;

                        var newNodes = this.CreateNodeArray(value);
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
                var ind = 0;
                detachNodes = new Array(this.nodesMap.size);
                this.nodesMap.forEach(nodeArrayList => {
                    var destroyNodes = detachNodes[ind++] = nodeArrayList;
                    destroyNodes.ForEach(nodes => {
                        for(var x=0; x<nodes.length; x++)
                            nodes[x].Destroy();
                    });
                });
            }

            this.nodesMap.clear();
            this.nodesMap = newNodesMap;
            Thread(() => {
                if(this.Destroyed)
                    return;

                if(init)
                    this.DetachAndAddNodes(detachNodes, newNodesMap.size > 0 && newNodesArrays);                
                else
                    NodeConfig.scheduleUpdate(() => {
                        if(this.Destroyed)
                            return;
                        
                        this.DetachAndAddNodes(detachNodes, newNodesMap.size > 0 && newNodesArrays);
                    });
            });
        });
    }

    private DetachAndAddNodes(detachNodes: Array<List<NodeRef[]>>, newNodes: Array<Array<NodeRef>>) {
        for(var x=0; detachNodes && x<detachNodes.length; x++)
            detachNodes[x].ForEach(nodes => {
                for(var x=0; x<nodes.length; x++)
                    nodes[x].Detach();
            });
        
        var previousNode: NodeRef = null;
        for(var x=0; newNodes && x<newNodes.length; x++) {
            for(var y=0; y<newNodes[x].length; y++) {
                this.AddChildAfter(previousNode, newNodes[x][y]);
                previousNode = newNodes[x][y];
            }
        }
    }

    private CreateNodeArray(value: any) {
        var nodes: NodeRef[] = null;
        Injector.Scope(this.Injector, () => {
            var newNodes = this.childrenFunc(value);
            if(typeof newNodes === "string")
                newNodes = [BoundNode.Create("text", null, { props: () => ({ nodeValue: this.childrenFunc(value) }) })];

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
        elem.Init();
        return elem;
    }

}