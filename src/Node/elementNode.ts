import { BoundNode, FunctionOr, NodeDefinition, defaultChildren } from "./boundNode";
import { Scope } from "../Store/scope/scope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";
import { List } from "../Utils/list";
import { AsyncQueue } from "../Utils/asyncQueue";

export type ElementNodeEvents = {
    [name: string]: {(event: Event): void}
}

export interface ElementNodeFunctionParam<T> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<ElementNodeEvents>;
    static?: T | Array<T>;
    data?: {(): T | Array<T>};
    text?: FunctionOr<string>;
}

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    children?: {(data?: T, i?: number): BoundNode};
}

export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T): NodeRef | NodeRef[]}): BoundNode}

function EmptyAsyncCallback(next: {(): void}) {
    next();
} 

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T): NodeRef | NodeRef[]};
    private nodesMap: Map<any, List<Array<BoundNode>>>;
    private dataScope: Scope<any>;
    private arrayScope: Scope<Array<T>>;
    private mapScope: Scope<Map<T, List<Array<BoundNode>>>>;
    private lastEvents: {[name: string]: any};
    private asyncQueue: AsyncQueue;
    private setData: boolean;

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
            var mapInit = array.map(v => [v, new List()] as [any, List<Array<BoundNode>>]);
            return new Map<T, List<Array<BoundNode>>>(mapInit);
        });
        this.mapScope.Watch(() => this.ScheduleSetDataAsync());
        this.asyncQueue = new AsyncQueue(EmptyAsyncCallback, EmptyAsyncCallback);
    }

    private SetDataSync() {
        var dataArray = this.arrayScope.Value;

        var newNodesMap = this.mapScope.Value;
        this.InitSetData(newNodesMap);
        var previousNode: BoundNode = null;
        dataArray.forEach(value => {
            previousNode = this.ValueSetData(value, previousNode, newNodesMap);
        });

        this.FinishSetData(newNodesMap);
    }

    private ScheduleSetDataAsync() {
        if(this.setData)
            return;

        this.setData = true;
        this.asyncQueue.Cancel(() => {
            NodeConfig.scheduleUpdate(() => {
                this.setData = false;
                this.SetDataAsync();
            });
        });
    }

    private SetDataAsync() {
        var previousNode: BoundNode = null;
        var dataArray = this.arrayScope.Value;
        var newNodesMap: Map<any, List<Array<BoundNode>>> = null;

        this.asyncQueue = new AsyncQueue((next) => {
            NodeConfig.scheduleUpdate(() => {
                if(!this.Destroyed) {
                    newNodesMap = this.mapScope.Value;
                    this.InitSetData(newNodesMap);
                }
                next();
            });
        }, (next) => {
            NodeConfig.scheduleUpdate(() => {
                if(!this.Destroyed)
                    this.FinishSetData(newNodesMap);
                
                next();
            });
        });
        
        dataArray.forEach(value => {
            this.asyncQueue.Add((next) => {
                NodeConfig.scheduleUpdate(() => {
                    if(!this.Destroyed)
                        previousNode = this.ValueSetData(value, previousNode, newNodesMap);
                    
                    next();
                });
            });
        });

        this.asyncQueue.Start();
    }

    private InitSetData(newNodesMap: Map<any, List<Array<BoundNode>>>) {
        this.nodesMap.forEach((nodesList, value) => {
            if(!newNodesMap.has(value))
                nodesList.ForEach(nodes => nodes.forEach(n => {
                    n.Detach();
                    n.Destroy();
                }));
        });
    }

    private ValueSetData(value: T, previousNode: BoundNode, newNodesMap: Map<any, List<Array<BoundNode>>>) {
        var nodes: Array<BoundNode> = null;
        var nodesList = this.nodesMap.get(value);
        if(nodesList && nodesList.Size > 0) {
            nodes = nodesList.Tail;
            nodesList.PopEnd();
        }
        
        if(nodesList && nodesList.Size === 0)
            this.nodesMap.delete(value);

        if(!nodes) {
            Injector.Scope(this.Injector, () => {
                var parentVal = BoundNode.Immediate;
                BoundNode.Immediate = this.Immediate;
                nodes = this.childrenFunc(value) as BoundNode[]
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

    private FinishSetData(newNodesMap: Map<any, List<Array<BoundNode>>>) {
        this.nodesMap.forEach((nodesList) => {
            nodesList.ForEach(nodes => nodes.forEach(n => {
                n.Detach();
                n.Destroy();
            }));
        });

        this.nodesMap = newNodesMap;
    }

    public SetEvents() {
        if(this.Destroyed)
            return;
        
        for(var key in this.lastEvents)
            NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);

        var events = this.eventsScope.Value;
        for(var key in events)
            NodeConfig.addListener(this.Node, key, events[key]);

        this.lastEvents = events;
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
        this.asyncQueue.Cancel();
        this.dataScope.Destroy();
        this.arrayScope.Destroy();
        this.mapScope.Destroy();
    }

}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T): NodeRef | NodeRef[]}) {
        var def = {
            type: type,
            namespace: namespace,
            immediate: nodeDef.immediate,
            text: nodeDef.text,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on,
            static: nodeDef.static,
            data: nodeDef.data,
            children: children
        } as ElementNodeDefinition<any>;

        var elem = new ElementNode(def);
        elem.Init();
        return elem;
    }

}