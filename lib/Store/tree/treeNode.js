"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../Utils/emitter");
const treeNodeRefId_1 = require("./treeNodeRefId");
const scopeCollector_1 = require("../scope/scopeCollector");
const proxy_1 = require("./proxy");
class TreeNode {
    get Proxy() {
        scopeCollector_1.ScopeCollector.Register(this.emitter);
        if (this.Self !== this)
            return this.Self.Proxy;
        if (this.proxy !== undefined)
            return this.proxy;
        var value = this.Value;
        var proxyType = proxy_1.IProxy.ValueType(value);
        if (proxyType === proxy_1.IProxyType.Value)
            this.proxy = value;
        else
            this.proxy = proxy_1.IProxy.Create(this, proxyType);
        return this.proxy;
    }
    get ProxyArray() {
        this.UpdateProxyArray(this.Value);
        return this.proxyArray;
    }
    get Children() {
        return this.children;
    }
    get Path() {
        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
    }
    get StoreValue() {
        return this.resolvePath(this.Path);
    }
    get Value() {
        if (this.value === undefined)
            this.value = this.StoreValue;
        return this.value;
    }
    get Self() {
        var value = this.Value;
        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
        if (id !== undefined)
            return this.tree.GetIdNode(id);
        return this;
    }
    get Emitter() {
        return this.emitter;
    }
    get Property() {
        return this.property;
    }
    set Property(val) {
        if (this.property === val)
            return;
        if (this.parentNode) {
            this.parentNode.Children.delete(this.property);
            this.parentNode.Children.set(val, this);
        }
        this.property = val;
    }
    constructor(tree, parentNode, property, resolvePath) {
        this.tree = tree;
        this.proxy = undefined;
        this.value = undefined;
        this.parentNode = parentNode;
        this.Property = property;
        this.resolvePath = resolvePath;
        this.children = new Map();
        this.emitter = new emitter_1.default();
        this.emitter.addListener("set", () => {
            this.value = undefined;
            this.proxy = undefined;
            this.parentNode && this.parentNode.UpdateCachedArray(this.property, this.Proxy);
        });
    }
    UpdateCachedArray(index, value) {
        if (this.proxyArray)
            this.proxyArray[parseInt(index)] = value;
    }
    ClearCachedArray() {
        this.proxyArray = null;
    }
    EnsureChild(prop) {
        if (!this.children)
            return null;
        var child = this.children.get(prop);
        if (!child) {
            child = new TreeNode(this.tree, this, prop, this.resolvePath);
            this.children.set(prop, child);
        }
        return child;
    }
    Destroy() {
        this.parentNode && this.parentNode.Children.delete(this.property);
        this.parentNode = null;
        var children = this.children;
        this.children = new Map();
        children.forEach(val => val.Destroy());
        this.emitter.removeAllListeners();
    }
    UpdateProxyArray(value) {
        if (Array.isArray(value)) {
            var proxyArrayLength = this.proxyArray ? this.proxyArray.length : 0;
            this.proxyArray = this.proxyArray || new Array(value.length);
            if (value.length > proxyArrayLength) {
                for (var x = proxyArrayLength; x < value.length; x++) {
                    var child = this.EnsureChild(x.toString());
                    this.proxyArray[x] = child.Proxy;
                }
            }
            else if (value.length < this.proxyArray.length) {
                this.proxyArray.splice(value.length);
            }
        }
        else
            this.proxyArray = null;
    }
}
exports.TreeNode = TreeNode;
