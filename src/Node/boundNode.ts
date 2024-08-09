import { NodeConfig } from "./nodeConfig";
import { IBoundNodeBase } from "./boundNode.types";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";

export namespace BoundNode {
    
    export function Init(boundNode: IBoundNodeBase) {
        const nodeDef = boundNode.nodeDef;
        if(nodeDef.props) {
            const scope = ObservableScope.Create(nodeDef.props);
            boundNode.scopes ??= [];
            boundNode.scopes.push(scope);
            boundNode.assignProperties = NodeConfig.createPropertyAssignment(boundNode.node);
            ObservableScope.Watch(scope, function(scope) { ScheduleSetProperties(boundNode, scope) });
            const next = ObservableScope.Value(scope);
            boundNode.assignProperties(next);
        }

        if(nodeDef.attrs) {
            const scope = ObservableScope.Create(nodeDef.attrs);
            boundNode.scopes ??= [];
            boundNode.scopes.push(scope);

            ObservableScope.Watch(scope, function(scope) { ScheduleSetAttributes(boundNode, scope) });
            SetAttributes(boundNode, ObservableScope.Value(scope));
        }

        if(nodeDef.on) {
            const scope = ObservableScope.Create(nodeDef.on);
            boundNode.scopes ??= [];
            boundNode.scopes.push(scope);

            boundNode.assignEvents = NodeConfig.createEventAssignment(boundNode.node);

            ObservableScope.Watch(scope, function(scope) { ScheduleSetEvents(boundNode, scope) });
            const next = ObservableScope.Value(scope);
            boundNode.assignEvents(next);
        }
    }
}

function ScheduleSetProperties(node: IBoundNodeBase, scope: IObservableScope<{[name: string]: any}>) {
    if(node.setProperties)
        return;

    node.setProperties = true;
    NodeConfig.scheduleUpdate(function() {
        node.setProperties = false;
        if(node.destroyed)
            return;
        
        const next = ObservableScope.Value(scope);
        node.assignProperties(next);
    });
}

function ScheduleSetAttributes(node: IBoundNodeBase, scope: IObservableScope<{[name: string]: string}>) {
    if(node.setAttributes)
        return;

    node.setAttributes = true;
    NodeConfig.scheduleUpdate(function() {
        node.setAttributes = false;
        if(node.destroyed)
            return;
        
        SetAttributes(node, ObservableScope.Value(scope));
    });
}

function SetAttributes(node: IBoundNodeBase, attributes: { [name: string]: string; }) {
    if(!attributes)
        return;
    
    for(var key in attributes) {
        var val = NodeConfig.getAttribute(node.node, key);
        if(val !== attributes[key])
            NodeConfig.setAttribute(node.node, key, attributes[key]);
    }
}

function ScheduleSetEvents(node: IBoundNodeBase, scope: IObservableScope<{[name: string]: (...args: Array<any>) => void}>) {
    if(node.setEvents)
        return;

    node.setEvents = true;
    NodeConfig.scheduleUpdate(function() {
        node.setEvents = false;
        if(node.destroyed)
            return;
        
        const next = ObservableScope.Value(scope);
        node.assignEvents(next);
    });
}