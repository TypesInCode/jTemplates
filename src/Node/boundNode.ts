import { NodeConfig } from "./nodeConfig";
import { IBoundNodeBase } from "./boundNode.types";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";

export namespace BoundNode {
    
    export function Init(boundNode: IBoundNodeBase) {
        var nodeDef = boundNode.nodeDef;
        var propertiesScope = nodeDef.props ? 
            ObservableScope.Create(nodeDef.props) : null;
        var attributesScope = nodeDef.attrs ?
            ObservableScope.Create(nodeDef.attrs) : null;
        var eventsScope = nodeDef.on ? 
            ObservableScope.Create(nodeDef.on) : null;
        
        if(propertiesScope) {
            ObservableScope.Watch(propertiesScope, function(scope) { ScheduleSetProperties(boundNode, scope) });
            SetProperties(boundNode, ObservableScope.Value(propertiesScope));
        }

        if(attributesScope) {
            ObservableScope.Watch(attributesScope, function(scope) { ScheduleSetAttributes(boundNode, scope) });
            SetAttributes(boundNode, ObservableScope.Value(attributesScope));
        }

        if(eventsScope) {
            ObservableScope.Watch(eventsScope, function(scope) { ScheduleSetEvents(boundNode, scope) });
            SetEvents(boundNode, ObservableScope.Value(eventsScope));
        }

        if(propertiesScope || attributesScope || eventsScope)
            boundNode.destroyables.push({
                Destroy: function() {
                    ObservableScope.Destroy(propertiesScope);
                    ObservableScope.Destroy(attributesScope);
                    ObservableScope.Destroy(eventsScope);
                }
            });
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
        
        SetProperties(node, ObservableScope.Value(scope));
    });
}

function SetProperties(node: IBoundNodeBase, properties: { [name: string]: any; }) {
    if(!properties)
        return;

    NodeConfig.setProperties(node.node, node.lastProperties, properties);
    node.lastProperties = properties;
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
        
        SetEvents(node, ObservableScope.Value(scope));
    });
}

function SetEvents(node: IBoundNodeBase, events: { [name: string]: (...args: any[]) => void; }) {
    if(!events)
        return;

    for(var key in node.lastEvents)
        NodeConfig.removeListener(node.node, key, node.lastEvents[key]);

    for(var key in events)
        NodeConfig.addListener(node.node, key, events[key]);

    node.lastEvents = events;
}