import { BoundNode } from "./boundNode";
import { NodeRef, NodeRefType } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { Thread, Schedule, After } from "../Utils/thread";
import { ComponentNodeFunction, ComponentNodeFunctionParam, IComponentNode, IComponentNodeBase } from "./componentNode.types";
import { List } from "../Utils/list";
import { IElementDataNode } from "./elementNode.types";

export namespace ComponentNode {

    export function Fire<E, P extends keyof E>(event: P, data?: E[P]) {
        var eventCallback = this.componentEvents && this.componentEvents[event as string];
        eventCallback && eventCallback(data);
    }

    export function ToFunction<D = void, T = void, E = void>(type: any, namespace: string, constructor: ComponentConstructor<D, T, E>): ComponentNodeFunction<D, T, E> {
        return function(nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T) {
            return Create(type, namespace, nodeDef, constructor, templates);
        };
    }

    export function Init(componentNode: IComponentNodeBase<any, any, any>) {
        var nodeDef = componentNode.nodeDef;
        var events = nodeDef.on;
        nodeDef.on = null;

        componentNode.component = new componentNode.constructor(nodeDef.data, componentNode.templates, componentNode, events);
        SetChildren(componentNode);
        // componentNode.destroyables.push(componentNode.component);

        BoundNode.Init(componentNode);
    }

}

function Create<D, T, E>(type: any, namespace: string, nodeDef: ComponentNodeFunctionParam<D, E>, constructor: ComponentConstructor<D, T, E>, templates: T) {
    var compNode = NodeRef.Create(type, namespace, NodeRefType.ComponentNode) as IComponentNode<D, T, E>;
    compNode.nodeDef = nodeDef;
    compNode.constructor = constructor;
    compNode.templates = templates;
    return compNode;
}

function SetChildren(node: IComponentNodeBase<any, any, any>) {
    if(PreReq.Has(node.component)) {
        AddPreReqTemplate(node).then(function() {
            AddTemplate(node, false);
        })
    }
    else
        AddTemplate(node, true);
}

function AddPreReqTemplate(node: IComponentNodeBase<any, any, any>) {
    return new Promise<void>(resolve => {
        Thread(function() {
            const preNodes = Injector.Scope(node.injector, PreReqTemplate.Get, node.component);
            Schedule(function() {
                if(node.destroyed)
                    return;

                NodeRef.InitAll(node as IComponentNode<any, any, any>, preNodes);
            });

            Thread(function() {
                if(node.destroyed)
                    return;
                
                for(var x=0; x<preNodes.length; x++)
                    NodeRef.AddChild(node, preNodes[x]);

                PreReq.All(node.component).then(function() {
                    if(node.destroyed)
                        return;
                    
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

function InvokeNodeTemplate(node: IComponentNodeBase<any, any, any>) {
    const nodes = node.component.Template();
    if(!Array.isArray(nodes))
        return [nodes];

    return nodes;
}

function AddTemplate(node: IComponentNodeBase<any, any, any>, init: boolean) {
    Thread(function() {
        if(node.destroyed)
            return;

        const nodes = Injector.Scope(node.injector, InvokeNodeTemplate, node);
        
        Schedule(function() {
            NodeRef.InitAll(node as IComponentNode<any, any, any>, nodes);
        });

        Thread(function() {
            if(node.destroyed)
                return;

            const list = List.Create<IElementDataNode<unknown>>();
            List.Add(list, {
                value: undefined,
                init: true,
                nodes
            });

            if(init) {
                NodeRef.ReconcileChildren(node, list);
                List.Clear(list);
            }
            else
                NodeConfig.scheduleUpdate(function() {
                    if(node.destroyed)
                        return;

                    NodeRef.ReconcileChildren(node, list);
                    List.Clear(list);
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