import { BoundNode, FunctionOr, NodeDefinition, NodeRefEvents } from "./boundNode";
import { ObservableScope } from "../Store/Tree/observableScope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Thread, Schedule } from "../Utils/thread";

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    data?: {(): T | Array<T> | Promise<T> | Promise<Array<T>>};
    children?: {(data?: T): string | NodeRef | NodeRef[]};
}

export interface ElementNodeFunctionParam<T> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
    data?: {(): T | Array<T> | Promise<T> | Promise<Array<T>>};
}

export type ElementChildrenFunction<T> = {(data?: T): string | NodeRef | NodeRef[]};
export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): NodeRef}

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T): string | NodeRef | NodeRef[]};
    private nodesMap: Map<any, List<Array<NodeRef>>>;
    private dataScope: ObservableScopeAsync<any>;
    private arrayScope: ObservableScope<Array<T>>;
    private injector: Injector;
    private setData: boolean;

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.setData = false;
        this.nodesMap = new Map();
        this.childrenFunc = nodeDef.children;
        this.dataScope = new ObservableScopeAsync<any>(nodeDef.data || true);
        this.arrayScope = this.dataScope.Scope(data => {
            if(!this.childrenFunc)
                return [];
            
            var value = data as Array<T>;
            if(!value)
                value = [];
            else if(!Array.isArray(value))
                value = [value];

            return value;
        });
        
        this.injector = Injector.Current();
        this.arrayScope.Watch(this.ScheduleSetData.bind(this));
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

    private SetData() {
        var newNodesMap = new Map();
        var newNodesArrays = this.arrayScope.Value.map((value, index) => {
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

        var ind = 0;
        var detachNodes: Array<List<NodeRef[]>> = new Array(this.nodesMap.size);
        this.nodesMap.forEach(nodeArrayList => {
            var destroyNodes = detachNodes[ind++] = nodeArrayList;
            destroyNodes.ForEach(nodes => {
                for(var x=0; x<nodes.length; x++)
                    nodes[x].Destroy();
            });
        });

        this.nodesMap.clear();
        this.nodesMap = newNodesMap;
        Thread(() => {
            NodeConfig.scheduleUpdate(() => {
                if(this.Destroyed)
                    return;
                
                this.DetachAndAddNodes(detachNodes, newNodesMap.size > 0 && newNodesArrays);
            });
        });
    }

    private DetachAndAddNodes(detachNodes: Array<List<NodeRef[]>>, newNodes: Array<Array<NodeRef>>) {
        for(var x=0; x<detachNodes.length; x++)
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
        Injector.Scope(this.injector, () => {
            var newNodes = this.childrenFunc(value);
            if(typeof newNodes === "string")
                newNodes = [BoundNode.Create("text", null, { props: () => ({ nodeValue: this.childrenFunc(value) }) })];

            nodes = newNodes as Array<NodeRef>;
            if(!Array.isArray(nodes))
                nodes = [nodes];
        });

        return nodes;
    }

    public Init() {
        super.Init();
        this.SetData();
    }

    public Destroy() {
        super.Destroy();
        this.dataScope.Destroy();
        this.arrayScope.Destroy();
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