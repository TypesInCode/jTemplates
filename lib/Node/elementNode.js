"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const boundNode_1 = require("./boundNode");
const scope_1 = require("../Store/scope/scope");
const nodeConfig_1 = require("./nodeConfig");
const injector_1 = require("../Utils/injector");
class ElementNode extends boundNode_1.BoundNode {
    constructor(nodeDef) {
        super(nodeDef);
        this.setData = false;
        this.nodeRefMap = new Map();
        this.childrenFunc = nodeDef.children || boundNode_1.defaultChildren;
        this.keyFunc = nodeDef.key;
        this.dataScope = new scope_1.Scope(nodeDef.data || nodeDef.static || true);
        this.keyDataScope = this.dataScope.Scope(data => {
            var value = data;
            if (!value)
                value = [];
            else if (!Array.isArray(value))
                value = [value];
            var keyInit = value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v]);
            return new Map(keyInit);
        });
        this.keyDataScope.Watch(() => this.ScheduleSetData());
    }
    ScheduleSetData() {
        if (this.setData)
            return;
        this.setData = true;
        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
            this.SetData();
            this.setData = false;
        });
    }
    SetData() {
        if (this.Destroyed)
            return;
        var newNodeRefMap = new Map();
        var previousNode = null;
        var index = 0;
        var keyMap = this.keyDataScope.Value;
        this.nodeRefMap.forEach((value, key) => {
            if (!keyMap.has(key)) {
                value.forEach(v => {
                    v.Detach();
                    v.Destroy();
                });
            }
        });
        keyMap.forEach((value, key) => {
            var nodes = this.nodeRefMap.get(key);
            if (!nodes) {
                injector_1.Injector.Scope(this.Injector, () => {
                    var parentVal = boundNode_1.BoundNode.Immediate;
                    boundNode_1.BoundNode.Immediate = this.Immediate;
                    nodes = this.childrenFunc(value, index);
                    boundNode_1.BoundNode.Immediate = parentVal;
                });
                if (!Array.isArray(nodes))
                    nodes = [nodes];
            }
            for (var x = 0; x < nodes.length; x++) {
                this.AddChildAfter(previousNode, nodes[x]);
                previousNode = nodes[x];
            }
            newNodeRefMap.set(key, nodes);
            index++;
        });
        this.nodeRefMap = newNodeRefMap;
    }
    SetEvents() {
        if (this.Destroyed)
            return;
        for (var key in this.lastEvents)
            nodeConfig_1.NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);
        var events = this.eventsScope.Value;
        for (var key in events)
            nodeConfig_1.NodeConfig.addListener(this.Node, key, events[key]);
        this.lastEvents = events;
    }
    Init() {
        super.Init();
        if (this.Immediate) {
            this.SetData();
        }
        else {
            this.ScheduleSetData();
        }
    }
    Destroy() {
        super.Destroy();
        this.keyDataScope.Destroy();
        this.dataScope.Destroy();
    }
}
exports.ElementNode = ElementNode;
(function (ElementNode) {
    function Create(type, namespace, nodeDef, children) {
        var def = {
            type: type,
            namespace: namespace,
            immediate: nodeDef.immediate,
            text: nodeDef.text,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on,
            static: nodeDef.static,
            data: nodeDef.data,
            key: nodeDef.key,
            children: children
        };
        var elem = new ElementNode(def);
        elem.Init();
        return elem;
    }
    ElementNode.Create = Create;
})(ElementNode = exports.ElementNode || (exports.ElementNode = {}));
