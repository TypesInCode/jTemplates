import { NodeConfig } from "./nodeConfig";
import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";

export type FunctionOr<T> = {(...args: Array<any>): T } | T;

export type BoundNodeEvents = {
    [name: string]: {(...args: Array<any>): void}
}

export interface NodeDefinition<T = any, E = any> {
    type: any;
    namespace: string;
    immediate?: boolean;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<BoundNodeEvents>;
    static?: T | Array<T>;
    data?: any;
    text?: FunctionOr<string>;
}

export function defaultChildren(): Array<NodeRef> {
    return [];
}

export abstract class BoundNode extends NodeRef {
    private nodeDef: NodeDefinition;
    private lastProperties: any;
    private immediate: boolean;

    private setText = false;
    private setProperties = false;
    private setAttributes = false;
    private setEvents = false;

    protected textScope: Scope<string>;
    protected propertiesScope: Scope<{[name: string]: any}>;
    protected attributesScope: Scope<{[name: string]: string}>;
    protected eventsScope: Scope<{[name: string]: (...args: Array<any>) => void}>;

    protected get Immediate() {
        return this.immediate;
    }

    constructor(nodeDef: NodeDefinition) {
        super(NodeConfig.createNode(nodeDef.type, nodeDef.namespace));
        this.nodeDef = nodeDef;
        this.immediate = nodeDef.immediate !== undefined ? nodeDef.immediate : BoundNode.Immediate;
    }

    public ScheduleSetText() {
        if(this.setText)
            return;

        this.setText = true;
        NodeConfig.scheduleUpdate(() => {
            this.SetText();
            this.setText = false;
        });
    }

    public SetText() {
        if(this.Destroyed)
            return;

        NodeConfig.setText(this.Node, this.textScope.Value);
    }

    public ScheduleSetProperties() {
        if(this.setProperties)
            return;

        this.setProperties = true;
        NodeConfig.scheduleUpdate(() => {
            this.SetProperties();
            this.setProperties = false;
        });
    }

    public SetProperties() {
        if(this.Destroyed)
            return;
        
        var properties = this.propertiesScope.Value;
        this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
        this.lastProperties = properties;
    }

    public ScheduleSetAttributes() {
        if(this.setAttributes)
            return;

        this.setAttributes = true;
        NodeConfig.scheduleUpdate(() => {
            this.SetAttributes();
            this.setAttributes = false;
        });
    }

    public SetAttributes() {
        if(this.Destroyed)
            return;
        
        var attributes = this.attributesScope.Value;
        for(var key in attributes) {
            var val = NodeConfig.getAttribute(this.Node, key);
            if(val !== attributes[key])
                NodeConfig.setAttribute(this.Node, key, attributes[key]);
        }
    }

    public ScheduleSetEvents() {
        if(this.setEvents)
            return;

        this.setEvents = true;
        NodeConfig.scheduleUpdate(() => {
            this.SetEvents();
            this.setEvents = false;
        });
    }

    public abstract SetEvents(): void;

    public Init() {
        super.Init();

        if(this.nodeDef.text) {
            this.textScope = new Scope(this.nodeDef.text);
            this.textScope.Watch(this.nodeDef.immediate ? this.SetText.bind(this) : this.ScheduleSetText.bind(this));
            this.SetText();
        }

        if(this.nodeDef.props) {
            this.propertiesScope = new Scope(this.nodeDef.props);
            this.propertiesScope.Watch(this.nodeDef.immediate ? this.SetProperties.bind(this) : this.ScheduleSetProperties.bind(this));
            this.SetProperties();
        }

        if(this.nodeDef.attrs) {
            this.attributesScope = new Scope(this.nodeDef.attrs);
            this.attributesScope.Watch(this.nodeDef.immediate ? this.SetAttributes.bind(this) : this.ScheduleSetAttributes.bind(this));
            this.SetAttributes();
        }

        if(this.nodeDef.on) {
            this.eventsScope = new Scope(this.nodeDef.on);
            this.eventsScope.Watch(this.nodeDef.immediate ? this.SetEvents.bind(this) : this.ScheduleSetEvents.bind(this));
            this.SetEvents();
        }
    }

    public Destroy() {
        super.Destroy();
        this.attributesScope && this.attributesScope.Destroy();
        this.propertiesScope && this.propertiesScope.Destroy();
        this.textScope && this.textScope.Destroy();
        this.eventsScope && this.eventsScope.Destroy();
    }

    private SetPropertiesRecursive(target: {[key: string]: any}, lastValue: {[key: string]: any}, source: {[key: string]: any}) {
        if(typeof source !== "object")
            throw "Property binding must resolve to an object";

        for(var key in source) {
            var val = source[key];
            if(val && typeof val === 'object') {
                if(!target[key])
                    target[key] = {};
                
                this.SetPropertiesRecursive(target[key], lastValue && lastValue[key], val);
            }
            else if(!lastValue || lastValue[key] !== val) {
                if(NodeConfig.setPropertyOverrides[key])
                    NodeConfig.setPropertyOverrides[key](target, val);
                else
                    target[key] = val;
            }
        }
    }

}

export namespace BoundNode {
    export var Immediate = false;
}