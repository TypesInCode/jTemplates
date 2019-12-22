import { BoundNode, FunctionOr, NodeDefinition, defaultChildren } from "./boundNode";
import { Scope } from "../Store/scope/scope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";

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
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}

export interface ElementNodeDefinition<T> extends NodeDefinition<T> {
    children?: {(data?: T, i?: number): BoundNode};
}

export type ElementNodeFunction<T> = {(nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}): BoundNode}

export class ElementNode<T> extends BoundNode {
    private childrenFunc: {(data: T, index: number): NodeRef | NodeRef[]};
    private keyFunc: {(data: T): string};
    private nodeRefMap: Map<string, BoundNode[]>;
    private dataScope: Scope<any>;
    private keyDataScope: Scope<Map<string, T>>;
    private lastEvents: {[name: string]: any};

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.nodeRefMap = new Map();
        this.childrenFunc = nodeDef.children || defaultChildren;
        this.keyFunc = nodeDef.key;
        this.dataScope = new Scope(nodeDef.data || nodeDef.static || true);
        this.keyDataScope = this.dataScope.Scope(data => {
            var value = data as Array<T>;
            if(!value)
                value = [];
            else if(!Array.isArray(value))
                value = [value];

            var keyInit = value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v] as any);
            return new Map<string, T>(keyInit);
        });
        this.keyDataScope.addListener("set", () => this.ScheduleSetData());
    }

    private setData = false;
    public ScheduleSetData() {
        if(this.setData)
            return;

        this.setData = true;
        NodeConfig.scheduleUpdate(() => {
            this.SetData();
            this.setData = false;
        });
    }

    public SetData() {
        if(this.Destroyed)
            return;
        
        var newNodeRefMap = new Map();
        var previousNode: BoundNode = null;
        var index = 0;
        
        var keyMap = this.keyDataScope.Value;
        this.nodeRefMap.forEach((value, key) => {
            if(!keyMap.has(key)) {
                value.forEach(v => {
                    v.Detach();
                    v.Destroy();
                });
            }
        });

        keyMap.forEach((value: T, key: string) => {
            var nodes = this.nodeRefMap.get(key);
            if(!nodes) {
                Injector.Scope(this.Injector, () => {
                    var parentVal = BoundNode.Immediate;
                    BoundNode.Immediate = this.Immediate;
                    nodes = this.childrenFunc(value, index) as BoundNode[]
                    BoundNode.Immediate = parentVal;
                });
                if(!Array.isArray(nodes))
                    nodes = [nodes];
            }
            
            for(var x=0; x<nodes.length; x++) {
                this.AddChildAfter(previousNode, nodes[x]);
                previousNode = nodes[x];
            }
            
            newNodeRefMap.set(key, nodes);
            // this.nodeRefMap.delete(key);
            index++;
        });

        /* this.nodeRefMap.forEach(value => {
            value.forEach(v => {
                v.Detach();
                v.Destroy();
            });
        }); */

        this.nodeRefMap = newNodeRefMap;
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
            this.SetData();
        }
        else {
            this.ScheduleSetData();
        }
    }

    public Destroy() {
        super.Destroy();
        this.keyDataScope.Destroy();
        this.dataScope.Destroy();
    }

}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
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
            key: nodeDef.key,
            children: children
        } as ElementNodeDefinition<any>;

        var elem = new ElementNode(def);
        elem.Init();
        return elem;
    }

}