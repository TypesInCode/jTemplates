import { NodeConfig } from "./nodeConfig";
import { NodeRef } from "./nodeRef";
import { ObservableScopeAsync } from "../Store/Tree/observableScopeAsync";
import { Injector } from "../Utils/injector";
import { NodeDefinition, NodeRefEvents, BoundNodeFunctionParam } from "./boundNode.types";

export class BoundNode extends NodeRef {
    private nodeDef: NodeDefinition;
    private lastProperties: any;
    private lastEvents: {[name: string]: any};

    private setProperties = false;
    private destroyProperties = false;
    private setAttributes = false;
    private destroyAttributes = false;
    private setEvents = false;
    private destroyEvents = false;

    private setPropertiesBound: {(): void};
    private setEventsBound: {(): void};
    private setAttributesBound: {(): void};

    private propertiesScope: ObservableScopeAsync<{[name: string]: any}>;
    private attributesScope: ObservableScopeAsync<{[name: string]: string}>;
    private eventsScope: ObservableScopeAsync<{[name: string]: (...args: Array<any>) => void}>;

    protected get NodeDef() {
        return this.nodeDef;
    }

    constructor(nodeDef: NodeDefinition, injector = Injector.Current()) {
        super(NodeConfig.createNode(nodeDef.type, nodeDef.namespace), injector);
        this.nodeDef = nodeDef;
    }

    public Init() {
        super.Init();
        if(this.nodeDef.props) {
            this.propertiesScope = this.Injector.Get(this.nodeDef.props);
            if(!this.propertiesScope) {
                this.destroyProperties = true;
                this.propertiesScope = new ObservableScopeAsync(this.nodeDef.props);
            }
            this.setPropertiesBound = this.nodeDef.immediate ? 
                (scope: ObservableScopeAsync<{ [name: string]: any }>) => this.SetProperties(scope.Value) : 
                this.ScheduleSetProperties.bind(this);
            this.propertiesScope.Watch(this.setPropertiesBound);
            this.SetProperties(this.propertiesScope.Value);
        }

        if(this.nodeDef.attrs) {
            this.attributesScope = this.Injector.Get(this.nodeDef.attrs);
            if(!this.attributesScope) {
                this.destroyAttributes = true;
                this.attributesScope = new ObservableScopeAsync(this.nodeDef.attrs);
            }
            this.setAttributesBound = this.nodeDef.immediate ? 
                (scope: ObservableScopeAsync<{ [name: string]: string }>) => this.SetAttributes(scope.Value) : 
                this.ScheduleSetAttributes.bind(this);
            this.attributesScope.Watch(this.setAttributesBound);
            this.SetAttributes(this.attributesScope.Value);
        }

        if(this.nodeDef.on) {
            this.eventsScope = this.Injector.Get(this.nodeDef.on);
            if(!this.eventsScope) {
                this.destroyEvents = true;
                this.eventsScope = new ObservableScopeAsync(this.nodeDef.on);
            }
            this.setEventsBound = this.nodeDef.immediate ? 
                (scope: ObservableScopeAsync<NodeRefEvents>) => this.SetEvents(scope.Value) : 
                this.ScheduleSetEvents.bind(this);
            this.eventsScope.Watch(this.setEventsBound);
            this.SetEvents(this.eventsScope.Value);
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

    protected ScheduleSetProperties() {
        if(this.setProperties)
            return;

        this.setProperties = true;
        NodeConfig.scheduleUpdate(() => {
            this.setProperties = false;
            if(this.Destroyed)
                return;
            
            this.SetProperties(this.propertiesScope.Value);
        });
    }

    protected SetProperties(properties: { [name: string]: any; }) {
        if(!properties)
            return;

        this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
        this.lastProperties = properties;
    }

    protected ScheduleSetAttributes() {
        if(this.setAttributes)
            return;

        this.setAttributes = true;
        NodeConfig.scheduleUpdate(() => {
            this.setAttributes = false;
            if(this.Destroyed)
                return;
            
            this.SetAttributes(this.attributesScope.Value);
        });
    }

    protected SetAttributes(attributes: { [name: string]: string; }) {
        if(!attributes)
            return;
        
        for(var key in attributes) {
            var val = NodeConfig.getAttribute(this.Node, key);
            if(val !== attributes[key])
                NodeConfig.setAttribute(this.Node, key, attributes[key]);
        }
    }

    protected ScheduleSetEvents() {
        if(this.setEvents)
            return;

        this.setEvents = true;
        NodeConfig.scheduleUpdate(() => {
            this.setEvents = false;
            if(this.Destroyed)
                return;
            
            this.SetEvents(this.eventsScope.Value);
        });
    }

    protected SetEvents(events: { [name: string]: (...args: any[]) => void; }) {
        if(!events)
            return;

        for(var key in this.lastEvents)
            NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);

        for(var key in events)
            NodeConfig.addListener(this.Node, key, events[key]);

        this.lastEvents = events;
    }

    private SetPropertiesRecursive(target: {[key: string]: any}, lastValue: {[key: string]: any}, source: {[key: string]: any}, path = "") {
        for(var key in source) {
            var currentPath = path + key;
            var val = source[key];
            if(val && typeof val === 'object') {
                var targetChild = target[key];
                if(!targetChild)
                    targetChild = target[key] = {};
                
                this.SetPropertiesRecursive(targetChild, lastValue && lastValue[key], val, currentPath + ".");
            }
            else if(!(lastValue && lastValue[key] === val)) {
                if(Reflect.has(NodeConfig.setPropertyOverrides, currentPath))
                    NodeConfig.setPropertyOverrides[currentPath](target, val);
                else
                    target[key] = val;
            }
        }
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
        elem.Init();
        return elem;
    }
}