import { NodeConfig } from "./nodeConfig";
import { INodeRef } from "./nodeRef";
import { FunctionOr, NodeRefEvents} from "./boundNode.types";
import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";

export interface IBoundNode extends INodeRef {
    lastProperties: any;
    lastEvents: {[name: string]: any};

    setProperties: boolean;
    setAttributes: boolean;
    setEvents: boolean;
}

export namespace BoundNode {

    export function Create(type: any, namespace = "") {    
        var boundNode: IBoundNode = {
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
            destroyables: []
        };
        
        return boundNode;
    }

    export function Init(boundNode: IBoundNode, props: FunctionOr<{[name: string]: any}>, attrs: FunctionOr<{[name: string]: string}>, on: FunctionOr<NodeRefEvents>) {
        var propertiesScope = props ? 
            ObservableScope.Create(props) : null;
        var attributesScope = attrs ?
            ObservableScope.Create(attrs) : null;
        var eventsScope = on ? 
            ObservableScope.Create(on) : null;
        
        ObservableScope.Watch(propertiesScope, function() { ScheduleSetProperties(boundNode, propertiesScope) });
        ObservableScope.Watch(attributesScope, function() { ScheduleSetAttributes(boundNode, attributesScope) });
        ObservableScope.Watch(eventsScope, function() { ScheduleSetEvents(boundNode, eventsScope) });

        SetProperties(boundNode, ObservableScope.Value(propertiesScope));
        SetAttributes(boundNode, ObservableScope.Value(attributesScope));
        SetEvents(boundNode, ObservableScope.Value(eventsScope));

        boundNode.destroyables.push({
            Destroy: function() {
                ObservableScope.Destroy(propertiesScope);
                ObservableScope.Destroy(attributesScope);
                ObservableScope.Destroy(eventsScope);
            }
        });
    }
}

function ScheduleSetProperties(node: IBoundNode, scope: IObservableScope<{[name: string]: any}>) {
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

function SetProperties(node: IBoundNode, properties: { [name: string]: any; }) {
    if(!properties)
        return;

    NodeConfig.setProperties(node.node, properties);
    node.lastProperties = properties;
}

function ScheduleSetAttributes(node: IBoundNode, scope: IObservableScope<{[name: string]: string}>) {
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

function SetAttributes(node: IBoundNode, attributes: { [name: string]: string; }) {
    if(!attributes)
        return;
    
    for(var key in attributes) {
        var val = NodeConfig.getAttribute(node.node, key);
        if(val !== attributes[key])
            NodeConfig.setAttribute(node.node, key, attributes[key]);
    }
}

function ScheduleSetEvents(node: IBoundNode, scope: IObservableScope<{[name: string]: (...args: Array<any>) => void}>) {
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

function SetEvents(node: IBoundNode, events: { [name: string]: (...args: any[]) => void; }) {
    if(!events)
        return;

    for(var key in node.lastEvents)
        NodeConfig.removeListener(node.node, key, node.lastEvents[key]);

    for(var key in events)
        NodeConfig.addListener(node.node, key, events[key]);

    node.lastEvents = events;
}