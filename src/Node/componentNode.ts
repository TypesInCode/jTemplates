import { BoundNode, IBoundNode } from "./boundNode";
import { INodeRef, NodeRef } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { Thread, Schedule, After } from "../Utils/thread";
import { ComponentNodeEvents, ComponentNodeFunction, ComponentNodeFunctionParam } from "./componentNode.types";
import { FunctionOr } from "./boundNode.types";

export interface IComponentNode<D, T, E> extends IBoundNode {
    component: Component<D, T, E>;
    componentEvents: {[name: string]: {(...args: Array<any>): void}};
}

export namespace ComponentNode {

    export function Fire<E, P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event as string];
        eventCallback && eventCallback(data);
    }

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>): ComponentNodeFunction<D, T, E> {
        return (nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) => {
            var compNode = Create(type, namespace);
            var component = new constructor(nodeDef.data, templates, compNode, nodeDef.on as ComponentNodeEvents<E>);
            Init(compNode, component, nodeDef.props, nodeDef.attrs);
            return compNode;
        };
    }

}

function Create<D, T, E>(type: any, namespace: string) {
    var componentNode: IComponentNode<D, T, E> = {
        node: NodeConfig.createNode(type, namespace),
        injector: Injector.Current() || new Injector(),
        parent: null,
        childNodes: new Set<INodeRef>(),
        destroyed: false,
        lastProperties: null,
        lastEvents: null,

        setProperties: false,
        setAttributes: false,
        setEvents: false,

        component: null,
        componentEvents: null,

        destroyables: []
    }
    
    return componentNode;
}

function Init<D, T, E>(componentNode: IComponentNode<D, T, E>, component: Component<D, T, E>, props: FunctionOr<{[name: string]: any}>, attrs: FunctionOr<{[name: string]: string}>) {
    BoundNode.Init(componentNode, props, attrs, null);
    componentNode.component = component;
    SetChildren(componentNode);
    componentNode.destroyables.push(component);
}

function SetChildren(node: IComponentNode<any, any, any>) {
    if(PreReq.Has(node.component)) {
        AddPreReqTemplate(node).then(function() {
            AddTemplate(node, false);
        })
    }
    else
        AddTemplate(node, true);
}

function AddPreReqTemplate(node: IComponentNode<any, any, any>) {
    return new Promise(resolve => {
        Thread(function() {
            var preNodes: Array<INodeRef> = null;
            Schedule(function() {
                Injector.Scope(node.injector, () => 
                    preNodes = PreReqTemplate.Get(node.component)
                )
            });

            Thread(function() {
                if(node.destroyed)
                    return;
                
                for(var x=0; x<preNodes.length; x++)
                    NodeRef.AddChild(node, preNodes[x]);

                PreReq.All(node.component).then(function() {
                    for(var x=0; x<preNodes.length; x++)
                        NodeRef.Destroy(preNodes[x]);
                    
                    NodeConfig.scheduleUpdate(function() {
                        if(node.destroyed)
                            return;

                        for(var x=0; x<preNodes.length; x++)
                            NodeRef.DetachChild(node, preNodes[x]);

                        resolve();
                    });
                });
            });
        });
    });
}

function AddTemplate(node: IComponentNode<any, any, any>, init: boolean) {
    Thread(function() {
        if(node.destroyed)
            return;

        var nodes: INodeRef[] = null;
        Schedule(function() {
            Injector.Scope(node.injector, function() {
                nodes = node.component.Template() as INodeRef[];
            });

            if(!Array.isArray(nodes))
                nodes = [nodes];
        });

        Thread(function() {
            if(node.destroyed)
                return;

            if(init)
                for(var x=0; x<nodes.length; x++)
                    NodeRef.AddChild(node, nodes[x]);
            else
                NodeConfig.scheduleUpdate(function() {
                    if(node.destroyed)
                        return;

                    for(var x=0; x<nodes.length; x++)
                        NodeRef.AddChild(node, nodes[x]);
                });
        });

        if(node.component.Bound !== Component.prototype.Bound)
            After(function() {
                NodeConfig.scheduleUpdate(() =>
                    setTimeout(() => node.component.Bound(), 0)
                )
            });
    });
}