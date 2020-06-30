import { BoundNode } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { Thread, Schedule, After } from "../Utils/thread";
import { ComponentNodeDefinition, ComponentNodeFunction, ComponentNodeFunctionParam } from "./componentNode.types";

export class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    private component: Component<D, T, E>;
    private componentEvents: {[name: string]: {(...args: Array<any>): void}};

    constructor(nodeDef: ComponentNodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
        var events = nodeDef.on;
        nodeDef.on = null;

        super(nodeDef, new Injector());
        this.component = new constructor(nodeDef.data, templates, this, this.Injector);

        if(events)
            ComponentNode.SetComponentEvents(this, events);
        
        ComponentNode.SetChildren(this);
    }

    public Fire<P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event as string];
        eventCallback && eventCallback(data);
    }

    public Destroy() {
        super.Destroy();
        this.component.Destroy();
    }

    private static SetComponentEvents(node: ComponentNode<any, any, any>, events: { [name: string]: (...args: any[]) => void; }) {
        node.componentEvents = events;
    }

    private static SetChildren(node: ComponentNode<any, any, any>) {
        if(PreReq.Has(node.component)) {
            ComponentNode.AddPreReqTemplate(node).then(() => 
                this.AddTemplate(node, false)
            )
        }
        else
            this.AddTemplate(node, true);
    }

    private static AddPreReqTemplate(node: ComponentNode<any, any, any>) {
        return new Promise(resolve => {
            Thread(() => {
                var preNodes: Array<NodeRef> = null;
                Schedule(() =>
                    Injector.Scope(node.Injector, () => 
                        preNodes = PreReqTemplate.Get(node.component)
                    )
                );

                Thread(() => {
                    if(node.Destroyed)
                        return;
                    
                    for(var x=0; x<preNodes.length; x++)
                        node.AddChild(preNodes[x]);

                    PreReq.All(node.component).then(() => {
                        NodeConfig.scheduleUpdate(() => {
                            if(node.Destroyed)
                                return;

                            for(var x=0; x<preNodes.length; x++) {
                                preNodes[x].Destroy();
                                preNodes[x].Detach();
                            }

                            resolve();
                        });
                    });
                });
            });
        });
    }

    private static AddTemplate(node: ComponentNode<any, any, any>, init: boolean) {
        Thread(() => {
            if(node.Destroyed)
                return;

            var nodes: NodeRef[] = null;
            Schedule(() => {
                Injector.Scope(node.Injector, () => {
                    nodes = node.component.Template() as NodeRef[];
                });

                if(!Array.isArray(nodes))
                    nodes = [nodes];
            });

            Thread(() => {
                if(node.Destroyed)
                    return;

                if(init)
                    for(var x=0; x<nodes.length; x++)
                        node.AddChild(nodes[x])
                else
                    NodeConfig.scheduleUpdate(() => {
                        if(node.Destroyed)
                            return;

                        for(var x=0; x<nodes.length; x++)
                            node.AddChild(nodes[x]);
                    });
            });

            if(node.component.Bound !== Component.prototype.Bound)
                After(() => 
                    NodeConfig.scheduleUpdate(() =>
                        setTimeout(() => node.component.Bound(), 0)
                    )
                );
        });
    }

}

export namespace ComponentNode {

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>): ComponentNodeFunction<D, T, E> {
        return (nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) => {
            var def = {
                type: type,
                namespace: namespace,
                immediate: nodeDef.immediate,
                props: nodeDef.props,
                attrs: nodeDef.attrs,
                on: nodeDef.on,
                data: nodeDef.data
            } as ComponentNodeDefinition<D, E>;

            var comp = new ComponentNode<D, T, E>(def, constructor, templates);
            return comp;
        };
    }

}