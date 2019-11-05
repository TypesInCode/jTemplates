"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeConfig_1 = require("./nodeConfig");
const injector_1 = require("../Utils/injector");
class NodeRef {
    get Node() {
        return this.node;
    }
    get ChildNodes() {
        return this.childNodes;
    }
    set Parent(val) {
        if (this.parent && this.parent !== val)
            this.Detach();
        this.parent = val;
        this.parent && this.parent.ChildNodes.add(this);
    }
    get Injector() {
        return this.injector;
    }
    constructor(node) {
        this.node = node;
        this.childNodes = new Set();
        this.injector = new injector_1.Injector();
    }
    AddChild(nodeRef) {
        nodeRef.Parent = this;
        this.childNodes.add(nodeRef);
        nodeConfig_1.NodeConfig.addChild(this.Node, nodeRef.Node);
    }
    AddChildAfter(currentChild, newChild) {
        if (currentChild && !this.childNodes.has(currentChild))
            throw "currentChild is not valid";
        newChild.Parent = this;
        nodeConfig_1.NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
    }
    DetachChild(nodeRef) {
        this.childNodes.delete(nodeRef);
        nodeConfig_1.NodeConfig.removeChild(this.Node, nodeRef.Node);
    }
    Detach() {
        if (this.parent)
            this.parent.DetachChild(this);
        nodeConfig_1.NodeConfig.remove(this.Node);
    }
    Destroy() {
        this.Detach();
        this.ClearChildren();
    }
    ClearChildren() {
        this.childNodes.forEach(node => node.Destroy());
        this.childNodes.clear();
    }
}
exports.NodeRef = NodeRef;
//# sourceMappingURL=nodeRef.js.map