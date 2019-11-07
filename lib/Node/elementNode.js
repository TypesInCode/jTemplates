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
            return new Map(value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v]));
        });
        this.keyDataScope.addListener("set", () => this.ScheduleSetData());
        this.ScheduleSetData();
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
        var newNodeRefMap = new Map();
        var previousNode = null;
        var index = 0;
        this.keyDataScope.Value.forEach((value, key) => {
            var nodes = this.nodeRefMap.get(key);
            if (!nodes) {
                injector_1.Injector.Scope(this.Injector, () => nodes = this.childrenFunc(value, index));
                if (!Array.isArray(nodes))
                    nodes = [nodes];
            }
            for (var x = 0; x < nodes.length; x++) {
                this.AddChildAfter(previousNode, nodes[x]);
                previousNode = nodes[x];
            }
            newNodeRefMap.set(key, nodes);
            this.nodeRefMap.delete(key);
            index++;
        });
        this.nodeRefMap.forEach(value => {
            value.forEach(v => v.Destroy());
        });
        this.nodeRefMap = newNodeRefMap;
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
            text: nodeDef.text,
            props: nodeDef.props,
            attrs: nodeDef.attrs,
            on: nodeDef.on,
            static: nodeDef.static,
            data: nodeDef.data,
            key: nodeDef.key,
            children: children
        };
        return new ElementNode(def);
    }
    ElementNode.Create = Create;
})(ElementNode = exports.ElementNode || (exports.ElementNode = {}));
//# sourceMappingURL=elementNode.js.map