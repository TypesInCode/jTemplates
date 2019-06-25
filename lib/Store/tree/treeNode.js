"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_1 = require("../../emitter");
const treeNodeRefId_1 = require("./treeNodeRefId");
class TreeNode {
    get NodeCache() {
        return this.nodeCache;
    }
    set NodeCache(val) {
        this.nodeCache = val;
    }
    get Destroyed() {
        return this.destroyed;
    }
    get Parent() {
        return this.parentNode;
    }
    get Children() {
        return this.children;
    }
    get Path() {
        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
    }
    get Value() {
        if (this.destroyed)
            return undefined;
        return this.resolvePath(this.Path);
    }
    get Self() {
        if (this.destroyed)
            return this;
        var value = this.Value;
        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
        if (id !== undefined) {
            return this.tree.GetIdNode(id);
        }
        return this;
    }
    get Emitter() {
        return this.emitter;
    }
    get Property() {
        return this.property;
    }
    set Property(val) {
        this.property = val;
    }
    get ParentKey() {
        return this.parentKey;
    }
    set ParentKey(val) {
        this.parentKey = val;
    }
    constructor(tree, parentNode, property, resolvePath) {
        this.tree = tree;
        this.parentNode = parentNode;
        this.property = property;
        this.resolvePath = resolvePath;
        this.destroyed = false;
        this.children = new Map();
        this.emitter = new emitter_1.default();
        this.emitter.addListener("set", () => {
            this.nodeCache = null;
        });
        this.UpdateParentKey();
    }
    OverwriteChildren(children) {
        this.children = new Map(children);
    }
    UpdateParentKey() {
        if (this.parentKey === this.property || !this.parentNode)
            return;
        this.parentKey && this.parentNode.Children.delete(this.parentKey);
        this.parentNode.Children.set(this.property, this);
        ;
        this.parentKey = this.property;
    }
    EnsureChild(prop) {
        if (this.destroyed)
            return null;
        var child = this.Children.get(prop);
        if (!child) {
            child = new TreeNode(this.tree, this, prop, this.resolvePath);
            this.Children.set(prop, child);
        }
        return child;
    }
    Destroy() {
        if (this.destroyed)
            return;
        this.parentNode && this.parentNode.Children.delete(this.property);
        this.parentNode = null;
        this.children.forEach(val => val.Destroy());
        this.destroyed = true;
        this.emitter.emit("destroy", this.emitter);
        this.emitter.removeAllListeners();
    }
}
exports.TreeNode = TreeNode;
//# sourceMappingURL=treeNode.js.map