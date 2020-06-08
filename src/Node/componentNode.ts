import { BoundNode, NodeDefinition, FunctionOr } from "./boundNode";
import { NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { WorkSchedule } from "../Utils/workSchedule";

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
        WorkSchedule.Scope(schedule => {
            var templateNodes: NodeRef[] = null;
            schedule(() => {
                if(this.Destroyed)
                    return;
                
                var nodes: NodeRef | NodeRef[] = null;
                Injector.Scope(this.injector, () => {
                    nodes = this.component.Template() || [];
                });

                if(!Array.isArray(nodes))
                    templateNodes = [nodes];
                else
                    templateNodes = nodes;
            });

            schedule(() => {
                NodeConfig.scheduleUpdate(() => {
                    for(var x=0; x<templateNodes.length; x++)
                        this.AddChild(templateNodes[x]);

                    setTimeout(() => this.component.Bound(), 0);
                });
            });
        });
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