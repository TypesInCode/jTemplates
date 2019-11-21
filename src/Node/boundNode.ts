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
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<BoundNodeEvents>;
    static?: T | Array<T>;
    data?: any;
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}

export function defaultChildren(): Array<NodeRef> {
    return [];
}

export abstract class BoundNode extends NodeRef {
    private lastProperties: any;

    private setText = false;
    private setProperties = false;
    private setAttributes = false;
    private setEvents = false;

    protected textScope: Scope<string>;
    protected propertiesScope: Scope<{[name: string]: any}>;
    protected attributesScope: Scope<{[name: string]: string}>;
    protected eventsScope: Scope<{[name: string]: (...args: Array<any>) => void}>;

    constructor(nodeDef: NodeDefinition) {
        super(NodeConfig.createNode(nodeDef.type, nodeDef.namespace));

        if(nodeDef.text) {
            this.textScope = new Scope(nodeDef.text);
            this.textScope.addListener("set", this.ScheduleSetText.bind(this));
            this.SetText();
        }

        if(nodeDef.props) {
            this.propertiesScope = new Scope(nodeDef.props);
            this.propertiesScope.addListener("set", this.ScheduleSetProperties.bind(this));
            this.SetProperties();
        }

        if(nodeDef.attrs) {
            this.attributesScope = new Scope(nodeDef.attrs);
            this.attributesScope.addListener("set", this.ScheduleSetAttributes.bind(this));
            this.SetAttributes();
        }

        if(nodeDef.on) {
            this.eventsScope = new Scope(nodeDef.on);
            this.eventsScope.addListener("set", this.ScheduleSetEvents.bind(this));
            this.SetEvents();
        }
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
            if(typeof val === 'object') {
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