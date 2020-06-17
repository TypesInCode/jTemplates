import { BoundNode } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { Thread, Schedule, After } from "../Utils/thread";
import { ComponentNodeDefinition, ComponentNodeFunction, ComponentNodeFunctionParam } from "./componentNode.d";

export class ComponentNode<D = void, T = void, E = void> extends BoundNode {
    private component: Component<D, T, E>;
    private componentEvents: {[name: string]: {(...args: Array<any>): void}};

    constructor(nodeDef: ComponentNodeDefinition<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
        super(nodeDef, new Injector());
        this.component = new constructor(nodeDef.data, templates, this, this.Injector);
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

    protected SetEvents(events: { [name: string]: (...args: any[]) => void; }) {
        this.componentEvents = events;
    }

    private SetChildren() {
        if(PreReq.Has(this.component)) {
            this.AddPreReqTemplate().then(() => 
                this.AddTemplate(false)
            )
        }
        else
            this.AddTemplate(true);
    }

    private AddPreReqTemplate() {
        return new Promise(resolve => {
            Thread(() => {
                var preNodes: Array<NodeRef> = null;
                Schedule(() =>
                    Injector.Scope(this.Injector, () => 
                        preNodes = PreReqTemplate.Get(this.component)
                    )
                );

                Thread(() => {
                    if(this.Destroyed)
                        return;
                    
                    for(var x=0; x<preNodes.length; x++)
                        this.AddChild(preNodes[x]);

                    PreReq.All(this.component).then(() => {
                        NodeConfig.scheduleUpdate(() => {
                            if(this.Destroyed)
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

    private AddTemplate(init: boolean) {
        Thread(() => {
            if(this.Destroyed)
                return;

            var nodes: NodeRef[] = null;
            Schedule(() => {
                Injector.Scope(this.Injector, () => {
                    nodes = this.component.Template() as NodeRef[];
                });

                if(!Array.isArray(nodes))
                    nodes = [nodes];
            });

            Thread(() => {
                if(this.Destroyed)
                    return;

                if(init)
                    for(var x=0; x<nodes.length; x++)
                        this.AddChild(nodes[x])
                else
                    NodeConfig.scheduleUpdate(() => {
                        if(this.Destroyed)
                            return;

                        for(var x=0; x<nodes.length; x++)
                            this.AddChild(nodes[x]);
                    });
            });

            if(this.component.Bound !== Component.prototype.Bound)
                After(() => 
                    NodeConfig.scheduleUpdate(() =>
                        setTimeout(() => this.component.Bound(), 0)
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
            comp.Init();
            return comp;
        };
    }

}