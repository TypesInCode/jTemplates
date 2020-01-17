import { BoundNode, FunctionOr, NodeDefinition, defaultChildren, NodeRefEvents } from "./boundNode";
import { Scope } from "../Store/scope/scope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { AsyncQueue } from "../Utils/asyncQueue";

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    static?: T | Array<T>;
    data?: {(): T | Array<T>};
    children?: {(data?: T): string | NodeRef | NodeRef[]};
}

export interface ElementNodeFunctionParam<T> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<NodeRefEvents>;
    static?: T | Array<T>;
    data?: {(): T | Array<T>};
}

export type ElementChildrenFunction<T> = {(data?: T): string | NodeRef | NodeRef[]};
export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): NodeRef}

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T): string | NodeRef | NodeRef[]};
    private nodesMap: Map<any, List<Array<NodeRef>>>;
    private dataScope: Scope<any>;
    private arrayScope: Scope<Array<T>>;
    private mapScope: Scope<Map<T, List<Array<NodeRef>>>>;
    private asyncQueue: AsyncQueue<{ previousNode: NodeRef, nodeMap: Map<any, List<Array<NodeRef>>> }>;
    private setData: boolean;
    private injector: Injector;

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.setData = false;
        this.nodesMap = new Map();
        this.childrenFunc = nodeDef.children || defaultChildren;
        this.dataScope = new Scope(nodeDef.data || nodeDef.static || true);
        this.arrayScope = this.dataScope.Scope(data => {
            var value = data as Array<T>;
            if(!value)
                value = [];
            else if(!Array.isArray(value))
                value = [value];

            return value;
        });
        this.mapScope = this.arrayScope.Scope(array => {
            var mapInit = array.map(v => [v, new List()] as [any, List<Array<NodeRef>>]);
            return new Map<T, List<Array<NodeRef>>>(mapInit);
        });
        this.mapScope.Watch(() => this.ScheduleSetDataAsync());
        this.asyncQueue = new AsyncQueue();
        this.injector = Injector.Current();
    }

    private SetDataSync() {
        var dataArray = this.arrayScope.Value;

        var newNodesMap = this.mapScope.Value;
        this.InitSetData(newNodesMap);
        var previousNode: NodeRef = null;
        dataArray.forEach(value => {
            previousNode = this.ValueSetData(value, previousNode, newNodesMap);
        });

        this.FinishSetData(newNodesMap);
    }

    private ScheduleSetDataAsync() {
        if(this.setData)
            return;

        this.setData = true;
        if(this.asyncQueue.Running) {
            var oldData = this.asyncQueue.Stop();
            this.asyncQueue.Add((next, data) => {
                NodeConfig.scheduleUpdate(() => {
                    if(!this.Destroyed)
                        this.FinishSetData(oldData.nodeMap);
                    
                    next(data);
                }, true);
            });
        }

        NodeConfig.scheduleUpdate(() => {
            this.setData = false;
            if(!this.Destroyed)
                this.SetDataAsync();
        });
    }

    private SetDataAsync() {
        var dataArray = this.arrayScope.Value;

        this.asyncQueue.Add((next, data) => {
            NodeConfig.scheduleUpdate(() => {
                this.setData = false;
                if(!this.Destroyed)
                    this.InitSetData(data.nodeMap);
                
                next(data);
            }, true);
        });

        dataArray.forEach(value => {
            this.asyncQueue.Add((next, data) => {
                NodeConfig.scheduleUpdate(() => {
                    if(!this.Destroyed)
                        data.previousNode = this.ValueSetData(value, data.previousNode, data.nodeMap);

                    next(data);
                });
            });
        });

        this.asyncQueue.Add((next, data) => {
            NodeConfig.scheduleUpdate(() => {
                if(!this.Destroyed)
                    this.FinishSetData(data.nodeMap);
                
                next();
            });
        });

        this.asyncQueue.Start({ previousNode: null, nodeMap: this.mapScope.Value });
    }

    private InitSetData(newNodesMap: Map<any, List<Array<NodeRef>>>) {
        this.nodesMap.forEach((nodesList, value) => {
            if(!newNodesMap.has(value)) {
                nodesList.ForEach(nodes => nodes.forEach(n => {
                    n.Detach();
                    n.Destroy();
                }));
                this.nodesMap.set(value, null);
            }
        });
    }

    private ValueSetData(value: T, previousNode: NodeRef, newNodesMap: Map<any, List<Array<NodeRef>>>) {
        var nodes: Array<NodeRef> = null;
        var nodesList = this.nodesMap.get(value);
        if(nodesList && nodesList.Size > 0)
            nodes = nodesList.Remove();
        
        if(nodesList && nodesList.Size === 0)
            this.nodesMap.delete(value);

        if(!nodes) {
            Injector.Scope(this.injector, () => {
                var parentVal = BoundNode.Immediate;
                BoundNode.Immediate = this.Immediate;

                var newNodes = this.childrenFunc(value); // as BoundNode[]
                if(typeof newNodes === "string")
                    newNodes = [ElementNode.Create("text", null, { static: value }, this.childrenFunc)];

                nodes = newNodes as Array<NodeRef>;

                BoundNode.Immediate = parentVal; 
            });

            if(!Array.isArray(nodes))
                nodes = [nodes];
        }

        for(var x=0; x<nodes.length; x++) {
            this.AddChildAfter(previousNode, nodes[x]);
            previousNode = nodes[x];
        }

        var newNodesList = newNodesMap.get(value);
        newNodesList.Push(nodes);
        return previousNode;
    }

    private FinishSetData(newNodesMap: Map<any, List<Array<NodeRef>>>) {
        this.nodesMap.forEach((nodesList) => {
            nodesList && nodesList.ForEach(nodes => nodes.forEach(n => {
                n.Detach();
                n.Destroy();
            }));
        });

        this.nodesMap = newNodesMap;
    }

    public Init() {
        super.Init();
        
        if(this.Immediate) {
            this.SetDataSync();
        }
        else {
            this.ScheduleSetDataAsync();
        }
    }

    public Destroy() {
        super.Destroy();
        this.asyncQueue.Stop();
        this.dataScope.Destroy();
        this.arrayScope.Destroy();
        this.mapScope.Destroy();
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
            static: nodeDef.static,
            data: nodeDef.data,
            children: children
        } as ElementNodeDefinition<any>;

        var elem = new ElementNode<T>(def);
        elem.Init();
        return elem;
    }

}