import { NodeConfig } from "./nodeConfig";
import { IBoundNodeBase, NodeRefEvents } from "./boundNode.types";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";
import { DOMNodeConfig } from "../DOM/domNodeConfig";

export namespace BoundNode {

    function WrapEventObject(node: IBoundNodeBase, events: NodeRefEvents) {
        const keys = Object.keys(events);
        const ret = {} as NodeRefEvents;
        for(let x=0; x<keys.length; x++) {
            const event = keys[x];
            const eventFunc = events[event];
            ret[event] = function(...args: any[]) {
                if(node.destroyed)
                    return;

                return eventFunc(...args);
            };
        }

        return ret;
    }
    
    export function Init(boundNode: IBoundNodeBase) {
        const nodeDef = boundNode.nodeDef;
        if(nodeDef.props) {
            const scope = ObservableScope.Create(nodeDef.props);
            boundNode.assignProperties = NodeConfig.createPropertyAssignment(boundNode.node);
            if(!scope.static) {
                boundNode.scopes ??= [];
                boundNode.scopes.push(scope);
                ObservableScope.Watch(scope, function(scope) { ScheduleSetProperties(boundNode, scope) });
                const next = ObservableScope.Value(scope);
                boundNode.assignProperties(next);
            }
            else {
                boundNode.assignProperties(nodeDef.props);
                boundNode.assignProperties = null;
            }
        }

        if(nodeDef.attrs) {
            const scope = ObservableScope.Create(nodeDef.attrs);
            if(!scope.static) {
                boundNode.scopes ??= [];
                boundNode.scopes.push(scope);

                !scope.static && ObservableScope.Watch(scope, function(scope) { ScheduleSetAttributes(boundNode, scope) });
                SetAttributes(boundNode, ObservableScope.Value(scope));
            }
            else
                SetAttributes(boundNode, nodeDef.attrs as {
                    [name: string]: string;
                });
        }

        if(nodeDef.on) {
            const scope = ObservableScope.Create(nodeDef.on);
            boundNode.assignEvents = NodeConfig.createEventAssignment(boundNode.node);
            if(!scope.static) {
                const eventScope = ObservableScope.Create(function() {
                    const events = ObservableScope.Value(scope);
                    return WrapEventObject(boundNode, events);
                });
                boundNode.scopes ??= [];
                boundNode.scopes.push(scope, eventScope);
                !scope.static && ObservableScope.Watch(eventScope, function(scope) { ScheduleSetEvents(boundNode, scope) });
                const next = ObservableScope.Value(eventScope);
                boundNode.assignEvents(next);
            }
            else
                boundNode.assignEvents(WrapEventObject(boundNode, nodeDef.on as NodeRefEvents));
        }

        if(nodeDef.text) {
            const scope = ObservableScope.Create(nodeDef.text);
            boundNode.assignText = NodeConfig.createTextAssignment(boundNode.node);
            if(!scope.static) {
                boundNode.scopes ??= [];
                boundNode.scopes.push(scope);
                !scope.static && ObservableScope.Watch(scope, function(scope) { ScheduleSetText(boundNode, scope) });
                const next = ObservableScope.Value(scope);
                boundNode.assignText(next);
            }
            else {
                boundNode.assignText(nodeDef.text as string);
                boundNode.assignText = null;
            }
        }
    }
}

function ScheduleSetText(node: IBoundNodeBase, scope: IObservableScope<string>) {
    if(node.setText)
        return;

    node.setText = true;
    NodeConfig.scheduleUpdate(function() {
        node.setText = false;
        if(node.destroyed)
            return;

        const next = ObservableScope.Value(scope);
        node.assignText(next);
    });
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
        node.assignProperties(next || null);
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