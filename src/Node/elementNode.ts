import { BoundNode, FunctionOr, NodeDefinition, defaultChildren } from "./boundNode";
import { Scope } from "../Store/scope/scope";
import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { Injector } from "../Utils/injector";

export interface ElementNodeFunctionParam<T> {
    props?: FunctionOr<{[name: string]: any}>; //{(): {[name: string]: any}} | {[name: string]: any};
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<{[name: string]: {(event?: any): void}}>; // {(): {[name: string]: {(event?: any): void}}} | {[name: string]: {(event?: any): void}};
    static?: T | Array<T>;
    data?: {(): T | Array<T>}; // {(): P | Array<P>} | P | Array<P>;
    key?: (val: T) => any;
    text?: FunctionOr<string>; // {(): string} | string;
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

    constructor(nodeDef: ElementNodeDefinition<T>) {
        super(nodeDef);

        this.nodeRefMap = new Map();
        this.childrenFunc = nodeDef.children || defaultChildren;
        this.keyFunc = nodeDef.key;
        this.dataScope = new Scope(nodeDef.data || nodeDef.static || true);
        this.dataScope.addListener("set", () => this.ScheduleSetData());
        this.ScheduleSetData();
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
        var value = this.dataScope.Value as Array<T>;
        if(!Array.isArray(value))
            value = [value];

        // var keys = new Set(value.map((v, i) => this.keyFunc && this.keyFunc(v) || i.toString()));
        var keyValues = new Map<string, T>(value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v] as any));
        var newNodeRefMap = new Map();
        var previousNode: BoundNode = null;
        var index = 0;
        keyValues.forEach((value: T, key: string) => {
            var nodes = this.nodeRefMap.get(key);
            if(!nodes) {
                Injector.Scope(this.Injector, () => 
                    nodes = this.childrenFunc(value, index) as BoundNode[]
                );
                if(!Array.isArray(nodes))
                    nodes = [nodes];
            }
            
            for(var x=0; x<nodes.length; x++) {
                this.AddChildAfter(previousNode, nodes[x]);
                previousNode = nodes[x];
            }
            
            newNodeRefMap.set(key, nodes);
            this.nodeRefMap.delete(key);
            index++;
        });

        this.nodeRefMap.forEach(value => {
            value.forEach(v => v.Destroy());
        });

        this.nodeRefMap = newNodeRefMap;
    }

    public Destroy() {
        super.Destroy();
        this.dataScope.Destroy();
    }

}

export namespace ElementNode {
    
    export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children?: {(data?: T, i?: number): NodeRef | NodeRef[]}) {
        var def = {
            type: type,
            namespace: namespace,
            text: nodeDef.text,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on,
            static: nodeDef.static,
            data: nodeDef.data,
            key: nodeDef.key,
            children: children
        } as ElementNodeDefinition<any>;

        return new ElementNode(def);
    }

    /* export function CreateFunction<T>(type: string, namespace: string): BoundElementNodeFunction<T> {

        return (nodeDef: ElementNodeDefinition<T>, children?: {(data?: T, i?: number): BoundNode | BoundNode[]}) => {
            var def = {
                type: type,
                namespace: namespace,
                text: nodeDef.text,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data,
                key: nodeDef.key,
                children: children
            } as NodeDefinition<any>;

            return new ElementNodeRef(def);
        }

    } */

}