import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";

export type ComponentNodeEvents<E = void> = {
    [P in keyof E]: {(data?: E[P]): void};
}

interface ComponentNodeDefinition<D = void, E = void> extends NodeDefinition<D> {
    on: ComponentNodeEvents<E>;
    static?: D;
    data?: {(): D | Promise<D>};
}

export interface ComponentNodeFunctionParam<D = void, T = void, E = void> {
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>;
    on?: FunctionOr<ComponentNodeEvents<E>>;
    static?: D | Array<D>;
    data?: {(): D | Promise<D> };
    templates?: T;
}

export class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    private component: Component<D, T, E>;
    private componentEvents: {[name: string]: {(...args: Array<any>): void}};
    private injector: Injector;

    constructor(nodeDef: ComponentNodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
        super(nodeDef);
        this.injector = new Injector();
        this.component = new constructor(nodeDef.data, templates, this, this.injector);
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
            Injector.Scope(this.injector, () => 
                preNodes = PreReqTemplate.Get(this.component)
            );

            preNodes.forEach(node => {
                this.AddChild(node);
            });

            PreReq.All(this.component).then(() => {
                NodeConfig.scheduleUpdate(() => {
                    if(this.Destroyed)
                       return;
         
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
        Injector.Scope(this.injector, () => 
            nodes = this.component.Template() as Array<NodeRef>    
        );
        if(!Array.isArray(nodes))
            nodes = [nodes];

        nodes.forEach(node => {
            this.AddChild(node);
        });
        setTimeout(() => this.component.Bound(), 0);
    }

}

export namespace ComponentNode {

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>) {
        return (nodeDef: ComponentNodeFunctionParam<D, T, E>, templates?: T) => {
            var def = {
                type: type,
                namespace: namespace,
                immediate: nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                static: nodeDef.static,
                data: nodeDef.data
            } as ComponentNodeDefinition<D, E>;

            var comp = new ComponentNode<D, T, E>(def, constructor, templates);
            comp.Init();
            return comp;
        }
    }

}