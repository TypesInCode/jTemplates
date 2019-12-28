"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeConfig_1 = require("./nodeConfig");
const scope_1 = require("../Store/scope/scope");
const nodeRef_1 = require("./nodeRef");
function defaultChildren() {
    return [];
}
exports.defaultChildren = defaultChildren;
class BoundNode extends nodeRef_1.NodeRef {
    constructor(nodeDef) {
        super(nodeConfig_1.NodeConfig.createNode(nodeDef.type, nodeDef.namespace));
        this.setText = false;
        this.setProperties = false;
        this.setAttributes = false;
        this.setEvents = false;
        this.nodeDef = nodeDef;
        this.immediate = nodeDef.immediate !== undefined ? nodeDef.immediate : BoundNode.Immediate;
    }
    get Immediate() {
        return this.immediate;
    }
    ScheduleSetText() {
        if (this.setText)
            return;
        this.setText = true;
        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
            this.SetText();
            this.setText = false;
        });
    }
    SetText() {
        if (this.Destroyed)
            return;
        nodeConfig_1.NodeConfig.setText(this.Node, this.textScope.Value);
    }
    ScheduleSetProperties() {
        if (this.setProperties)
            return;
        this.setProperties = true;
        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
            this.SetProperties();
            this.setProperties = false;
        });
    }
    SetProperties() {
        if (this.Destroyed)
            return;
        var properties = this.propertiesScope.Value;
        this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
        this.lastProperties = properties;
    }
    ScheduleSetAttributes() {
        if (this.setAttributes)
            return;
        this.setAttributes = true;
        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
            this.SetAttributes();
            this.setAttributes = false;
        });
    }
    SetAttributes() {
        if (this.Destroyed)
            return;
        var attributes = this.attributesScope.Value;
        for (var key in attributes) {
            var val = nodeConfig_1.NodeConfig.getAttribute(this.Node, key);
            if (val !== attributes[key])
                nodeConfig_1.NodeConfig.setAttribute(this.Node, key, attributes[key]);
        }
    }
    ScheduleSetEvents() {
        if (this.setEvents)
            return;
        this.setEvents = true;
        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
            this.SetEvents();
            this.setEvents = false;
        });
    }
    Init() {
        super.Init();
        if (this.nodeDef.text) {
            this.textScope = new scope_1.Scope(this.nodeDef.text);
            this.textScope.Watch(this.nodeDef.immediate ? this.SetText.bind(this) : this.ScheduleSetText.bind(this));
            this.SetText();
        }
        if (this.nodeDef.props) {
            this.propertiesScope = new scope_1.Scope(this.nodeDef.props);
            this.propertiesScope.Watch(this.nodeDef.immediate ? this.SetProperties.bind(this) : this.ScheduleSetProperties.bind(this));
            this.SetProperties();
        }
        if (this.nodeDef.attrs) {
            this.attributesScope = new scope_1.Scope(this.nodeDef.attrs);
            this.attributesScope.Watch(this.nodeDef.immediate ? this.SetAttributes.bind(this) : this.ScheduleSetAttributes.bind(this));
            this.SetAttributes();
        }
        if (this.nodeDef.on) {
            this.eventsScope = new scope_1.Scope(this.nodeDef.on);
            this.eventsScope.Watch(this.nodeDef.immediate ? this.SetEvents.bind(this) : this.ScheduleSetEvents.bind(this));
            this.SetEvents();
        }
    }
    Destroy() {
        super.Destroy();
        this.attributesScope && this.attributesScope.Destroy();
        this.propertiesScope && this.propertiesScope.Destroy();
        this.textScope && this.textScope.Destroy();
        this.eventsScope && this.eventsScope.Destroy();
    }
    SetPropertiesRecursive(target, lastValue, source) {
        if (typeof source !== "object")
            throw "Property binding must resolve to an object";
        for (var key in source) {
            var val = source[key];
            if (val && typeof val === 'object') {
                if (!target[key])
                    target[key] = {};
                this.SetPropertiesRecursive(target[key], lastValue && lastValue[key], val);
            }
            else if (!lastValue || lastValue[key] !== val) {
                if (nodeConfig_1.NodeConfig.setPropertyOverrides[key])
                    nodeConfig_1.NodeConfig.setPropertyOverrides[key](target, val);
                else
                    target[key] = val;
            }
        }
    }
}
exports.BoundNode = BoundNode;
(function (BoundNode) {
    BoundNode.Immediate = false;
})(BoundNode = exports.BoundNode || (exports.BoundNode = {}));
