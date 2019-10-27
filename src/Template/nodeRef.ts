import { BindingConfig } from "./Binding/bindingConfig";

var nodeRefId = 1;
export class NodeRef {
    private node: any;
    private parent: NodeRef;
    private type: string;
    private nodeRefId: string;
    private childNodeRefs: Map<string, NodeRef> = new Map();
    private lastProperties: any;
    private lastEvents: {[name: string]: any};
    private attached = false;
    private attachedCallbacks: Array<{(): void}> = [];

    public get Node() {
        if(!this.attached)
            return null;
        
        if(!this.node)
            this.node = BindingConfig.getNodeById(this.nodeRefId);

        return this.node;
    }

    public get Id() {
        return this.nodeRefId;
    }

    protected set Parent(val: NodeRef) {
        if(this.parent && this.parent !== val)
            this.Detach();
        
        this.parent = val;
    }

    constructor(type: string | Node, private namespace?: string) {
        this.nodeRefId = `NodeRef.${nodeRefId++}`;
        if(typeof type === 'string')
            this.type = type;
        else {
            this.node = type;
            this.attached = true;
        }
    }

    public AddChild(nodeRef: NodeRef) {
        nodeRef.Parent = this;
        this.childNodeRefs.set(nodeRef.Id, nodeRef);

        if(this.Node) {
            if(nodeRef.Node)
                BindingConfig.addChild(this.Node, nodeRef.Node);
            else
                BindingConfig.appendXml(this.Node, nodeRef.ToXml());

            nodeRef.Attached();
        }
    }

    public AddChildAfter(currentChild: NodeRef, newChild: NodeRef) {
        if(currentChild && !this.childNodeRefs.has(currentChild.Id))
            throw "currentChild is not valid";

        newChild.Parent = this;
        this.childNodeRefs.set(newChild.Id, newChild);

        if(this.Node) {
            if(newChild.Node)
                BindingConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
            else
                BindingConfig.appendXmlAfter(this.Node, currentChild && currentChild.Node, newChild.ToXml());

            newChild.Attached();
        }
    }

    public AddChildren(nodeRefs: Array<NodeRef>) {
        if(nodeRefs.length === 0)
            return;
        
        var xml = "";
        for(var x=0; x<nodeRefs.length; x++) {
            var ref = nodeRefs[x];
            ref.Parent = this;
            this.childNodeRefs.set(ref.Id, ref);
            if(this.Node) {
                if(ref.Node)
                    BindingConfig.addChild(this.Node, ref.Node);
                else
                    xml += ref.ToXml();
            }
        }

        if(this.Node) {
            BindingConfig.appendXml(this.Node, xml);
            for(var x=0; x<nodeRefs.length; x++)
                nodeRefs[x].Attached();
        }
    }

    public SetText(text: string) {
        this.OnAttached(() => 
            BindingConfig.setText(this.Node, text)
        );
    }

    public SetProperties(properties: {[key: string]: any}) {
        this.OnAttached(() => {
            this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
            this.lastProperties = properties;
        });
    }

    public SetAttributes(attributes: {[name: string]: string}) {
        this.OnAttached(() => {      
            for(var key in attributes) {
                var val = BindingConfig.getAttribute(this.Node, key);
                if(val !== attributes[key])
                    BindingConfig.setAttribute(this.Node, key, attributes[key]);
            }
        });
    }

    public SetEvents(events: {[name: string]: any}) {
        this.OnAttached(() => {      
            for(var key in this.lastEvents)
                BindingConfig.removeListener(this.Node, key, this.lastEvents[key]);

            for(var key in events)
                BindingConfig.addListener(this.Node, key, events[key]);

            this.lastEvents = events;
        });
    }

    public DetachChild(nodeRef: NodeRef) {
        this.childNodeRefs.delete(nodeRef.Id);

        if(this.Node && nodeRef.Node)
            BindingConfig.removeChild(this.Node, nodeRef.Node);
    }

    public Detach() {
        if(this.parent)
            this.parent.DetachChild(this);

        if(this.Node)
            BindingConfig.remove(this.Node);
    }

    public ToXml() {
        var xml = `<${this.type} id='${this.Id}'${this.namespace ? ` xmlns='${this.namespace}'` : ''}>`;
        this.childNodeRefs.forEach((value) => {
            xml += value.ToXml();
        });
        xml += `</${this.type}>`;
        return xml;
    }

    protected Attached() {        
        if(this.attached)
            return;

        this.attached = true;
        this.attachedCallbacks.forEach((cb) => cb());
        this.attachedCallbacks = [];
        this.childNodeRefs.forEach((nodeRef) => nodeRef.Attached());
        this.attached = true;
    }

    private OnAttached(callback: {(): void}) {
        if(this.attached) {
            callback();
            return;
        }

        this.attachedCallbacks.push(callback);
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
                if(BindingConfig.setPropertyOverrides[key])
                    BindingConfig.setPropertyOverrides[key](target, val);
                else
                    target[key] = val;
            }
        }
    }

}