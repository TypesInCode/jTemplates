"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bindingConfig_1 = require("./Binding/bindingConfig");
var nodeRefId = 1;
class NodeRef {
    constructor(type, namespace) {
        this.namespace = namespace;
        this.childNodeRefs = new Map();
        this.attached = false;
        this.attachedCallbacks = [];
        this.nodeRefId = `NodeRef.${nodeRefId++}`;
        if (typeof type === 'string')
            this.type = type;
        else {
            this.node = type;
            this.attached = true;
        }
    }
    get Node() {
        if (!this.attached)
            return null;
        if (!this.node)
            this.node = bindingConfig_1.BindingConfig.getNodeById(this.nodeRefId);
        return this.node;
    }
    get Id() {
        return this.nodeRefId;
    }
    set Parent(val) {
        if (this.parent && this.parent !== val)
            this.Detach();
        this.parent = val;
    }
    AddChild(nodeRef) {
        nodeRef.Parent = this;
        this.childNodeRefs.set(nodeRef.Id, nodeRef);
        if (this.Node) {
            if (nodeRef.Node)
                bindingConfig_1.BindingConfig.addChild(this.Node, nodeRef.Node);
            else
                bindingConfig_1.BindingConfig.appendXml(this.Node, nodeRef.ToXml());
            nodeRef.Attached();
        }
    }
    AddChildAfter(currentChild, newChild) {
        if (currentChild && !this.childNodeRefs.has(currentChild.Id))
            throw "currentChild is not valid";
        newChild.Parent = this;
        this.childNodeRefs.set(newChild.Id, newChild);
        if (this.Node) {
            if (newChild.Node)
                bindingConfig_1.BindingConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
            else
                bindingConfig_1.BindingConfig.appendXmlAfter(this.Node, currentChild && currentChild.Node, newChild.ToXml());
            newChild.Attached();
        }
    }
    AddChildren(nodeRefs) {
        if (nodeRefs.length === 0)
            return;
        var xml = "";
        for (var x = 0; x < nodeRefs.length; x++) {
            var ref = nodeRefs[x];
            ref.Parent = this;
            this.childNodeRefs.set(ref.Id, ref);
            if (this.Node) {
                if (ref.Node)
                    bindingConfig_1.BindingConfig.addChild(this.Node, ref.Node);
                else
                    xml += ref.ToXml();
            }
        }
        if (this.Node) {
            bindingConfig_1.BindingConfig.appendXml(this.Node, xml);
            for (var x = 0; x < nodeRefs.length; x++)
                nodeRefs[x].Attached();
        }
    }
    SetText(text) {
        this.OnAttached(() => bindingConfig_1.BindingConfig.setText(this.Node, text));
    }
    SetProperties(properties) {
        this.OnAttached(() => {
            this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
            this.lastProperties = properties;
        });
    }
    SetAttributes(attributes) {
        this.OnAttached(() => {
            for (var key in attributes) {
                var val = bindingConfig_1.BindingConfig.getAttribute(this.Node, key);
                if (val !== attributes[key])
                    bindingConfig_1.BindingConfig.setAttribute(this.Node, key, attributes[key]);
            }
        });
    }
    SetEvents(events) {
        this.OnAttached(() => {
            for (var key in this.lastEvents)
                bindingConfig_1.BindingConfig.removeListener(this.Node, key, this.lastEvents[key]);
            for (var key in events)
                bindingConfig_1.BindingConfig.addListener(this.Node, key, events[key]);
            this.lastEvents = events;
        });
    }
    DetachChild(nodeRef) {
        this.childNodeRefs.delete(nodeRef.Id);
        if (this.Node && nodeRef.Node)
            bindingConfig_1.BindingConfig.removeChild(this.Node, nodeRef.Node);
    }
    Detach() {
        if (this.parent)
            this.parent.DetachChild(this);
        if (this.Node)
            bindingConfig_1.BindingConfig.remove(this.Node);
    }
    ToXml() {
        var xml = `<${this.type} id='${this.Id}'${this.namespace ? ` xmlns='${this.namespace}'` : ''}>`;
        this.childNodeRefs.forEach((value) => {
            xml += value.ToXml();
        });
        xml += `</${this.type}>`;
        return xml;
    }
    Attached() {
        if (this.attached)
            return;
        this.attached = true;
        this.attachedCallbacks.forEach((cb) => cb());
        this.attachedCallbacks = [];
        this.childNodeRefs.forEach((nodeRef) => nodeRef.Attached());
        this.attached = true;
    }
    OnAttached(callback) {
        if (this.attached) {
            callback();
            return;
        }
        this.attachedCallbacks.push(callback);
    }
    SetPropertiesRecursive(target, lastValue, source) {
        if (typeof source !== "object")
            throw "Property binding must resolve to an object";
        for (var key in source) {
            var val = source[key];
            if (typeof val === 'object') {
                if (!target[key])
                    target[key] = {};
                this.SetPropertiesRecursive(target[key], lastValue && lastValue[key], val);
            }
            else if (!lastValue || lastValue[key] !== val) {
                if (bindingConfig_1.BindingConfig.setPropertyOverrides[key])
                    bindingConfig_1.BindingConfig.setPropertyOverrides[key](target, val);
                else
                    target[key] = val;
            }
        }
    }
}
exports.NodeRef = NodeRef;
//# sourceMappingURL=nodeRef.js.map