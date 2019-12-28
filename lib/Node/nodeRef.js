"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeConfig_1 = require("./nodeConfig");
const injector_1 = require("../Utils/injector");
class NodeRef {
    get Destroyed() {
        return this.destroyed;
    }
    get Node() {
        return this.node;
    }
    get Injector() {
        return this.injector;
    }
    constructor(node) {
        this.node = node;
        this.destroyed = false;
        this.childNodes = new Set();
        this.injector = new injector_1.Injector();
    }
    AddChild(nodeRef) {
        nodeRef.parent = this;
        this.childNodes.add(nodeRef);
        nodeConfig_1.NodeConfig.addChild(this.Node, nodeRef.Node);
    }
    AddChildAfter(currentChild, newChild) {
        if (currentChild && !this.childNodes.has(currentChild))
            throw "currentChild is not valid";
        newChild.parent = this;
        this.childNodes.add(newChild);
        nodeConfig_1.NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
    }
    DetachChild(nodeRef) {
        if (this.childNodes.has(nodeRef)) {
            this.childNodes.delete(nodeRef);
            nodeConfig_1.NodeConfig.removeChild(this.Node, nodeRef.Node);
            nodeRef.parent = null;
        }
    }
    Init() {
    }
    Detach() {
        if (this.parent)
            this.parent.DetachChild(this);
    }
    Destroy() {
        this.destroyed = true;
        this.DestroyChildren();
    }
    DestroyChildren() {
        this.childNodes.forEach(node => node.Destroy());
    }
}
exports.NodeRef = NodeRef;
