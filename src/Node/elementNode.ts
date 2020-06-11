import { BoundNode, FunctionOr, NodeDefinition, NodeRefEvents } from "./boundNode";
import { ObservableScope } from "../Store/Tree/observableScope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Thread, Schedule, Callback } from "../Utils/thread";
// import { WorkSchedule } from "../Utils/workSchedule";

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
        var valueArray = this.arrayScope.Value;
        var newNodesArrays = new Array<NodeRef[]>(valueArray.length);
        var missingNodeIndexes: Array<number> = [];
        var detachNodes: Array<NodeRef> = [];
        var newNodesMap = new Map();

        for(var x=0; x<valueArray.length; x++) {
            var nodeArrayList = this.nodesMap.get(valueArray[x]);
            var nodes = nodeArrayList && nodeArrayList.Remove();
            if(nodeArrayList && nodeArrayList.Size === 0)
                this.nodesMap.delete(valueArray[x]);

            var newNodeArrayList = newNodesMap.get(valueArray[x]);
            if(!newNodeArrayList) {
                newNodeArrayList = new List<NodeRef[]>();
                newNodesMap.set(valueArray[x], newNodeArrayList);
            }

            if(nodes) {
                newNodeArrayList.Push(nodes);
                newNodesArrays[x] = nodes;
            }
            else
                missingNodeIndexes.push(x);
        }

        this.nodesMap.forEach(nodeArrayList => 
            nodeArrayList.ForEach(nodes => {
                detachNodes.push(...nodes);
                for(var x=0; x<nodes.length; x++)
                    nodes[x].Destroy();
            })
        );

        this.nodesMap.clear();
        this.nodesMap = newNodesMap;
        this.DetachCreateAddNodes(detachNodes, valueArray, missingNodeIndexes, newNodesArrays, this.nodesMap);
    }

    private DetachCreateAddNodes(detachNodes: Array<NodeRef>, valueArray: Array<any>, missingNodeIndexes: Array<number>, newNodesArrays: Array<Array<NodeRef>>, nodesMap: Map<any, List<Array<NodeRef>>>) {
        Thread(() => {
            if(this.Destroyed)
                return;
            
            missingNodeIndexes.forEach(Callback(index => {
                if(this.Destroyed || nodesMap.size === 0)
                    return;
                    
                var nodes = this.CreateNodeArray(valueArray[index]);
                nodesMap.get(valueArray[index]).Push(nodes);
                newNodesArrays[index] = nodes;
            }));

            Schedule(() => {
                if(this.Destroyed)
                    return;
                
                NodeConfig.scheduleUpdate(() =>
                    this.DetachAndAddNodes(detachNodes, newNodesArrays, nodesMap.size === 0)
                );
            });
        });
    }

    private DetachAndAddNodes(detachNodes: Array<NodeRef>, newNodes: Array<Array<NodeRef>>, skipAdd: boolean) {
        if(this.Destroyed)
            return;

        for(var d=0; d<detachNodes.length; d++)
            detachNodes[d].Detach();
        
        if(skipAdd)
            return;
        
        var previousNode: NodeRef = null;
        for(var x=0; x<newNodes.length; x++) {
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