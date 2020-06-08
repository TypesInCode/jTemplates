import { BoundNode, FunctionOr, NodeDefinition, NodeRefEvents } from "./boundNode";
import { ObservableScope } from "../Store/Tree/observableScope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { WorkSchedule } from "../Utils/workSchedule";

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
        setTimeout(() => {
            this.setData = false;
            if(this.Destroyed)
                return;
            
            this.SetData();
        }, 0);
    }


    private SetData() {
        var newNodesArrays = new Array<NodeRef[]>(this.arrayScope.Value.length);
        WorkSchedule.Scope(schedule => {
            var newNodesMap = new Map();
            this.arrayScope.Value.forEach((value, index) => {
                var nodeArrayList = this.nodesMap.get(value);
                var nodes = nodeArrayList && nodeArrayList.Remove();
                if(nodeArrayList && nodeArrayList.Size === 0)
                    this.nodesMap.delete(value);

                var newNodeArrayList = newNodesMap.get(value);
                if(!newNodeArrayList) {
                    newNodeArrayList = new List<NodeRef[]>();
                    newNodesMap.set(value, newNodeArrayList);
                }

                if(nodes) {
                    newNodeArrayList.Push(nodes);
                    newNodesArrays[index] = nodes;
                }
                else {
                    schedule(() => {
                        if(this.Destroyed)
                            return;

                        nodes = this.CreateNodeArray(value);
                        newNodeArrayList.Push(nodes);
                        newNodesArrays[index] = nodes;
                    });
                }
            });

            this.nodesMap.forEach(nodeArrayList => 
                nodeArrayList.ForEach(nodes => {
                    for(var x=0; x<nodes.length; x++) {
                        nodes[x].Detach();
                        nodes[x].Destroy();
                    }
                })
            );

            this.nodesMap = newNodesMap;
        });
        
        WorkSchedule.Scope(schedule => {
            schedule(() => {
                if(this.Destroyed)
                    return;
            
                var previousNode: NodeRef = null;
                newNodesArrays.forEach(nodes => 
                    NodeConfig.scheduleUpdate(() => {
                        if(this.Destroyed)
                            return;
                        
                        for(var x=0; x<nodes.length; x++) {
                            if(!nodes[x].Destroyed) {
                                this.AddChildAfter(previousNode, nodes[x]);
                                previousNode = nodes[x];
                            }
                        }
                    })
                );
            });
        });
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