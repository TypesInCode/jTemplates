import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Injector } from "../Utils/injector";
import { NodeDefinition, NodeRefEvents, BoundNodeFunctionParam } from "./boundNode.types";

export class BoundNode extends NodeRef {
    private lastProperties: any;
    private lastEvents: {[name: string]: any};

    private setProperties = false;
    private destroyProperties = false;
    private setAttributes = false;
    private destroyAttributes = false;
    private setEvents = false;
    private destroyEvents = false;

    private setPropertiesBound: {(...args: any[]): void};
    private setEventsBound: {(...args: any[]): void};
    private setAttributesBound: {(...args: any[]): void};

    private propertiesScope: ObservableScopeAsync<{[name: string]: any}>;
    private attributesScope: ObservableScopeAsync<{[name: string]: string}>;
    private eventsScope: ObservableScopeAsync<{[name: string]: (...args: Array<any>) => void}>;

    constructor(nodeDef: NodeDefinition, injector = Injector.Current()) {
        super(NodeConfig.createNode(nodeDef.type, nodeDef.namespace), injector);

        if(nodeDef.props) {
            this.propertiesScope = this.Injector.Get(nodeDef.props);
            if(!this.propertiesScope) {
                this.destroyProperties = true;
                this.propertiesScope = new ObservableScopeAsync(nodeDef.props);
            }
            this.setPropertiesBound = nodeDef.immediate ? 
                (scope: ObservableScopeAsync<{ [name: string]: any }>) => BoundNode.SetProperties(this, scope.Value) : 
                () => BoundNode.ScheduleSetProperties(this);
            this.propertiesScope.Watch(this.setPropertiesBound);
            BoundNode.SetProperties(this, this.propertiesScope.Value);
        }

        if(nodeDef.attrs) {
            this.attributesScope = this.Injector.Get(nodeDef.attrs);
            if(!this.attributesScope) {
                this.destroyAttributes = true;
                this.attributesScope = new ObservableScopeAsync(nodeDef.attrs);
            }
            this.setAttributesBound = nodeDef.immediate ? 
                (scope: ObservableScopeAsync<{ [name: string]: string }>) => BoundNode.SetAttributes(this, scope.Value) : 
                () => BoundNode.ScheduleSetAttributes(this);
            this.attributesScope.Watch(this.setAttributesBound);
            BoundNode.SetAttributes(this, this.attributesScope.Value);
        }

        if(nodeDef.on) {
            this.eventsScope = this.Injector.Get(nodeDef.on);
            if(!this.eventsScope) {
                this.destroyEvents = true;
                this.eventsScope = new ObservableScopeAsync(nodeDef.on);
            }
            this.setEventsBound = nodeDef.immediate ? 
                (scope: ObservableScopeAsync<NodeRefEvents>) => BoundNode.SetEvents(this, scope.Value) : 
                () => BoundNode.ScheduleSetEvents(this);
            this.eventsScope.Watch(this.setEventsBound);
            BoundNode.SetEvents(this, this.eventsScope.Value);
        }
    }

    public Destroy() {
        super.Destroy();
        if(this.attributesScope) {
            if(this.destroyAttributes)
                this.attributesScope.Destroy();
            else
                this.attributesScope.Unwatch(this.setAttributesBound);
        }

        if(this.propertiesScope) {
            if(this.destroyProperties)
                this.propertiesScope.Destroy();
            else
                this.propertiesScope.Unwatch(this.setPropertiesBound);
        }
        
        if(this.eventsScope) {
            if(this.destroyEvents)
                this.eventsScope.Destroy();
            else
                this.eventsScope.Unwatch(this.setEventsBound);
        }
    }

    private static ScheduleSetProperties(node: BoundNode) {
        if(node.setProperties)
            return;

        node.setProperties = true;
        NodeConfig.scheduleUpdate(() => {
            node.setProperties = false;
            if(node.Destroyed)
                return;
            
            BoundNode.SetProperties(node, node.propertiesScope.Value);
        });
    }

    private static SetProperties(node: BoundNode, properties: { [name: string]: any; }) {
        if(!properties)
            return;

        SetPropertiesRecursive(node.Node, node.lastProperties, properties);
        node.lastProperties = properties;
    }

    private static ScheduleSetAttributes(node: BoundNode) {
        if(node.setAttributes)
            return;

        node.setAttributes = true;
        NodeConfig.scheduleUpdate(() => {
            node.setAttributes = false;
            if(node.Destroyed)
                return;
            
            BoundNode.SetAttributes(node, node.attributesScope.Value);
        });
    }

    private static SetAttributes(node: BoundNode, attributes: { [name: string]: string; }) {
        if(!attributes)
            return;
        
        for(var key in attributes) {
            var val = NodeConfig.getAttribute(node.Node, key);
            if(val !== attributes[key])
                NodeConfig.setAttribute(node.Node, key, attributes[key]);
        }
    }

    private static ScheduleSetEvents(node: BoundNode) {
        if(node.setEvents)
            return;

        node.setEvents = true;
        NodeConfig.scheduleUpdate(() => {
            node.setEvents = false;
            if(node.Destroyed)
                return;
            
            BoundNode.SetEvents(node, node.eventsScope.Value);
        });
    }

    private static SetEvents(node: BoundNode, events: { [name: string]: (...args: any[]) => void; }) {
        if(!events)
            return;

        for(var key in node.lastEvents)
            NodeConfig.removeListener(node.Node, key, node.lastEvents[key]);

        for(var key in events)
            NodeConfig.addListener(node.Node, key, events[key]);

        node.lastEvents = events;
    }
}

export namespace BoundNode {
    export function Create<T>(type: any, namespace: string, nodeDef: BoundNodeFunctionParam<T>) {
        var def = {
            type: type,
            namespace: namespace,
            immediate: nodeDef.immediate,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on
        } as NodeDefinition<any>;

        var elem = new BoundNode(def);
        return elem;
    }
}

function SetPropertiesRecursive(target: {[key: string]: any}, lastValue: {[key: string]: any}, source: {[key: string]: any}, path = "") {
    for(var key in source) {
        var currentPath = path + key;
        var val = source[key];
        if(val && typeof val === 'object') {
            var targetChild = target[key];
            if(!targetChild)
                targetChild = target[key] = {};
            
            SetPropertiesRecursive(targetChild, lastValue && lastValue[key], val, currentPath + ".");
        }
        else if(!(lastValue && lastValue[key] === val)) {
            if(Reflect.has(NodeConfig.setPropertyOverrides, currentPath))
                NodeConfig.setPropertyOverrides[currentPath](target, val);
            else
                target[key] = val;
        }
    }
}