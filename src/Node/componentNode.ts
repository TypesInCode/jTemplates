import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { ElementNode } from "./elementNode";

export type ComponentNodeEvents<E> = {
    [P in keyof E]: {(data?: E[P]): void};
}

/* export interface IComponentContext<D, T> {
    scope: Scope<D>;
    templates: T;
} */

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

/* export interface ComponentNodeDefinition<D, T> extends NodeDefinition<D> {
    templates?: T;
    component: ComponentConstructor<D, T>;
} */

export class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    /* private childrenFunc: {(ctx: IComponentContext<D, T>): NodeRef | NodeRef[]};
    private templates: T;
    private dataScope: Scope<D>; */
    private component: Component<D, T, E>;
    private componentEvents: {[name: string]: {(...args: Array<any>): void}};

    constructor(nodeDef: NodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
        super(nodeDef);

        /* this.childrenFunc = nodeDef.children || defaultChildren;
        this.dataScope = new Scope(nodeDef.data || nodeDef.static || true);
        this.templates = nodeDef.templates; */
        // this.component = new nodeDef.component(nodeDef.data || nodeDef.static, nodeDef.templates, this, this.Injector);
        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);

        if(ElementNode.BindImmediately || nodeDef.immediate) {
            var staticBindingValue = ElementNode.BindImmediately;
            ElementNode.BindImmediately = true;
            this.SetChildren();
            ElementNode.BindImmediately = staticBindingValue;
        }
        else
            this.SetChildren();
    }

    public SetEvents() {
        this.componentEvents = this.eventsScope.Value;        
    }

    public Fire<P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event as string];
        eventCallback && eventCallback(data);
    }

    /* private setChildren = false;
    public ScheduleSetChildren() {
        if(this.setChildren)
            return;

        NodeConfig.scheduleUpdate(() => {
            this.SetChildren();
            this.setChildren = false;
        });

    } */

    public SetChildren() {
        // this.DestroyChildren();
        // var nodes = this.childrenFunc({ scope: this.dataScope, templates: this.templates }) as NodeRef[];
        var nodes = null as Array<NodeRef>;
        Injector.Scope(this.Injector, () => 
            nodes = this.component.Template() as Array<NodeRef>
        );
        if(!Array.isArray(nodes))
            nodes = [nodes];

        nodes.forEach(node => this.AddChild(node));
        setTimeout(() => this.component.Bound(), 0);
    }

    public Destroy() {
        super.Destroy();
        this.component.Destroy();
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
                immediate: !!nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data,
                // key: nodeDef.key,
                /* templates: templates,
                component: constructor */
            }

            return new ComponentNode<D, T, E>(def, constructor, templates);
        }
    }

}