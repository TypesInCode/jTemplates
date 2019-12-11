import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { ElementNode } from "./elementNode";
import { PreReq, PreReqTemplate } from "../Utils/decorators";

export type ComponentNodeEvents<E> = {
    [P in keyof E]: {(data?: E[P]): void};
}

export interface ComponentNodeFunctionParam<D, T, E> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>; //{(): {[name: string]: any}} | {[name: string]: any};
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<ComponentNodeEvents<E>>; // {(): {[name: string]: {(event?: any): void}}} | {[name: string]: {(event?: any): void}};
    static?: D | Array<D>;
    data?: {(): D | Array<D>}; // {(): P | Array<P>} | P | Array<P>;
    // key?: (val: D) => any;
    // text?: FunctionOr<string>; // {(): string} | string;
    templates?: T;
}

export class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    private component: Component<D, T, E>;
    private componentEvents: {[name: string]: {(...args: Array<any>): void}};

    constructor(nodeDef: NodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
        super(nodeDef);
        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);
    }

    public SetEvents() {
        this.componentEvents = this.eventsScope.Value;        
    }

    public Fire<P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event as string];
        eventCallback && eventCallback(data);
    }

    public Init() {
        super.Init();
        this.SetChildren();
    }

    public Destroy() {
        super.Destroy();
        this.component.Destroy();
    }

    private SetChildren() {
        if(PreReq.Has(this.component)) {
            var preNodes = null as Array<NodeRef>;
            Injector.Scope(this.Injector, () => 
                preNodes = PreReqTemplate.Get(this.component)
            );

            preNodes.forEach(node => {
                this.AddChild(node);
            });

            PreReq.All(this.component).then(() => {
                NodeConfig.scheduleUpdate(() => {
                    preNodes.forEach(node => {
                        node.Detach();
                        node.Destroy();
                    });

                    this.AddTemplate();
                });
            });
        }
        else
            this.AddTemplate();
    }

    private AddTemplate() {
        var nodes = null as Array<NodeRef>;
        Injector.Scope(this.Injector, () => {
            var parentVal = BoundNode.Immediate;
            BoundNode.Immediate = this.Immediate;
            nodes = this.component.Template() as Array<NodeRef>
            BoundNode.Immediate = parentVal;
        });
        if(!Array.isArray(nodes))
            nodes = [nodes];

        nodes.forEach(node => {
            this.AddChild(node);
        });
        setTimeout(() => this.component.Bound(), 0);
    }

}

export namespace ComponentNode {

    // export function CreateFunction<D, T = any>(type: any, namespace: string, childrenFunc: {(ctx: IComponentContext<D, T>): NodeRef | NodeRef[]}) {
    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>) {
        return (nodeDef: ComponentNodeFunctionParam<D, T, E>, templates?: T) => {
            var def = {
                type: type,
                namespace: namespace,
                // text: nodeDef.text,
                immediate: nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data,
                // key: nodeDef.key,
                /* templates: templates,
                component: constructor */
            }

            var comp = new ComponentNode<D, T, E>(def, constructor, templates);
            comp.Init();
            return comp;
        }
    }

}