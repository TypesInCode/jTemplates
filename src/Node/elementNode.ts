import { BoundNode, FunctionOr, NodeDefinition, defaultChildren, NodeRefEvents } from "./boundNode";
import { ObservableScope } from "../Store/Tree/observableScope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { AsyncQueue } from "../Utils/asyncQueue";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    data?: {(): T | Array<T> | Promise<T> | Promise<Array<T>>};
    children?: {(data?: T): string | NodeRef | NodeRef[]};
}

export interface ElementNodeFunctionParam<T> {
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
    private asyncQueue: AsyncQueue<{ previousNode: NodeRef }>;
    private injector: Injector;

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.setData = false;
        this.nodesMap = new Map();
        this.childrenFunc = nodeDef.children || defaultChildren;
        this.dataScope = new ObservableScopeAsync<any>(nodeDef.data || true);
        this.arrayScope = this.dataScope.Scope(data => {
            var value = data as Array<T>;
            if(!value)
                value = [];
            else if(!Array.isArray(value))
                value = [value];

            return value;
        });
        this.asyncQueue = new AsyncQueue();
        this.injector = Injector.Current();
        this.arrayScope.Watch(() => this.ScheduleSetData());
    }

    private setData = false;
    private ScheduleSetData() {
        if(this.setData)
            return;

        this.setData = true;
        this.asyncQueue.Stop();
        NodeConfig.scheduleUpdate(() => {
            this.setData = false;
            if(this.Destroyed)
                return;
            
            this.SetData();
        });
    }

    private SetData() {
        this.asyncQueue.Stop();
        var newNodesMap = new Map();

        this.arrayScope.Value.forEach(value => {
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

            this.asyncQueue.Add((next, data) => {
                NodeConfig.scheduleUpdate(() => {
                    if(this.Destroyed)
                        return;

                    if(!nodes) {
                        nodes = this.CreateNodeArray(value);
                        newNodeArrayList.Push(nodes);
                    }

                    for(var x=0; x<nodes.length; x++) {
                        this.AddChildAfter(data.previousNode, nodes[x]);
                        data.previousNode = nodes[x];
                    }

                    next(data); 
                });
            });
        });
        
        this.nodesMap.forEach(nodeArrayList => 
            nodeArrayList.ForEach(nodes => 
                nodes.forEach(node => {
                    node.Detach();
                    node.Destroy();
                })
            )
        );
        this.nodesMap = newNodesMap;
        this.asyncQueue.Start({ previousNode: null });
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
        this.ScheduleSetData();
    }

    public Destroy() {
        super.Destroy();
        this.asyncQueue.Stop();
        this.dataScope.Destroy();
        this.arrayScope.Destroy();
    }

}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>) {
        var def = {
            type: type,
            namespace: namespace,
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