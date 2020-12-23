import { BoundNode } from "./boundNode";
import { NodeRef, NodeRefType } from "./nodeRef";
import { NodeConfig } from "./nodeConfig";
import { Component, ComponentConstructor } from "./component";
import { Injector } from "../Utils/injector";
import { PreReq, PreReqTemplate } from "../Utils/decorators";
import { Thread, Schedule, After } from "../Utils/thread";
import { ComponentNodeFunction, ComponentNodeFunctionParam, IComponentNode, IComponentNodeBase } from "./componentNode.types";
import { NodeRefTypes } from "./nodeRef.types";

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
        componentNode.destroyables.push(componentNode.component);

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
    return new Promise(resolve => {
        Thread(function() {
            var preNodes: Array<NodeRefTypes>;
            Injector.Scope(node.injector, () => 
                preNodes = PreReqTemplate.Get(node.component)
            );
            Schedule(function() {
                if(node.destroyed)
                    return;

                NodeRef.InitAll(preNodes);
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

function AddTemplate(node: IComponentNodeBase<any, any, any>, init: boolean) {
    Thread(function() {
        if(node.destroyed)
            return;

        var nodes: NodeRefTypes[];
        Injector.Scope(node.injector, function() {
            nodes = node.component.Template() as NodeRefTypes[];
        });
        if(!Array.isArray(nodes))
            nodes = [nodes];
        
        Schedule(function() {
            NodeRef.InitAll(nodes);
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