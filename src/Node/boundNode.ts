import { NodeConfig } from "./nodeConfig";
import { Scope } from "../Store/scope/scope";
import { NodeRef } from "./nodeRef";

export type FunctionOr<T> = {(...args: Array<any>): T } | T;

export interface NodeDefinition<T> {
    type: any;
    namespace: string;
    props?: FunctionOr<{[name: string]: any}>;
    attrs?: FunctionOr<{[name: string]: string}>,
    on?: FunctionOr<{[name: string]: {(event?: any): void}}>;
    static?: T | Array<T>;
    data?: any;
    key?: (val: T) => any;
    text?: FunctionOr<string>;
}

export function defaultChildren(): Array<NodeRef> {
    return [];
}

export class BoundNode extends NodeRef {
    private lastProperties: any;
    private lastEvents: {[name: string]: any};

    private textScope: Scope<string>;
    private propertiesScope: Scope<{[name: string]: any}>;
    private attributesScope: Scope<{[name: string]: string}>;
    private eventsScope: Scope<{[name: string]: (...args: Array<any>) => void}>;

    private setText = false;
    private setProperties = false;
    private setAttributes = false;
    private setEvents = false;

    constructor(nodeDef: NodeDefinition<any>) {
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

    /* public AddChildren(nodeRefs: Array<NodeRef>) {
        if(nodeRefs.length === 0)
            return;
        
        var xml = "";
        for(var x=0; x<nodeRefs.length; x++) {
            var ref = nodeRefs[x];
            ref.Parent = this;
            this.childNodeRefs.set(ref.Id, ref);
            if(this.Node) {
                if(ref.Node)
                    NodeConfig.addChild(this.Node, ref.Node);
                else
                    xml += ref.ToXml();
            }
        }

        if(this.Node) {
            NodeConfig.appendXml(this.Node, xml);
            for(var x=0; x<nodeRefs.length; x++)
                nodeRefs[x].Attached();
        }
    } */

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

    public SetEvents() {
        for(var key in this.lastEvents)
            NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);

        var events = this.eventsScope.Value;
        for(var key in events)
            NodeConfig.addListener(this.Node, key, events[key]);

        this.lastEvents = events;
    }

    public Destroy() {
        super.Destroy();
        this.attributesScope && this.attributesScope.Destroy();
        this.propertiesScope && this.propertiesScope.Destroy();
        this.textScope && this.textScope.Destroy();
        this.eventsScope && this.eventsScope.Destroy();
    }

    /* public ToXml() {
        var xml = `<${this.type} id='${this.Id}'${this.namespace ? ` xmlns='${this.namespace}'` : ''}>`;
        this.childNodeRefs.forEach((value) => {
            xml += value.ToXml();
        });
        xml += `</${this.type}>`;
        return xml;
    } */

    /* protected Attached() {        
        if(this.attached)
            return;

        this.attached = true;
        this.attachedCallbacks.forEach((cb) => cb());
        this.attachedCallbacks = [];
        this.childNodeRefs.forEach((nodeRef) => nodeRef.Attached());
        this.attached = true;
    } */

    /* private OnAttached(callback: {(): void}) {
        if(this.attached) {
            callback();
            return;
        }

        this.attachedCallbacks.push(callback);
    } */

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