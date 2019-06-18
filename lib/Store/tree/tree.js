"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const treeNode_1 = require("./treeNode");
class Tree {
    constructor(resolvePath) {
        this.root = new treeNode_1.TreeNode(this, null, "root", resolvePath);
        this.id = new treeNode_1.TreeNode(this, null, "id", resolvePath);
    }
    GetNode(path, ensure) {
        if (!path)
            return null;
        return path.split(".").reduce((pre, curr, index) => {
            if (index === 0)
                return curr === "id" ? this.id : this.root;
            return pre && (ensure ? pre.EnsureChild(curr) : pre.Children.get(curr));
        }, null);
    }
    GetIdNode(id) {
        return this.GetNode(`id.${id}`, true);
    }
    Destroy() {
        this.root.Destroy();
        this.id.Destroy();
    }
}
exports.Tree = Tree;
//# sourceMappingURL=tree.js.map