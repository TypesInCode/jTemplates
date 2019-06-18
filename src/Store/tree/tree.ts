import { TreeNode } from "./treeNode";

export class Tree {
    private root: TreeNode;
    private id: TreeNode;

    constructor(resolvePath: { (path: string): any }) { // manager: StoreManager<any>) {
        this.root = new TreeNode(this, null, "root", resolvePath);
        this.id = new TreeNode(this, null, "id", resolvePath);
    }

    public GetNode(path: string, ensure?: boolean) {
        if(!path)
            return null;
        
        return path.split(".").reduce((pre: TreeNode, curr: string, index) => {
            if(index === 0)
                return curr === "id" ? this.id : this.root;

            return pre && (ensure ? pre.EnsureChild(curr) : pre.Children.get(curr));
        }, null);
    }

    public GetIdNode(id: string) {
        return this.GetNode(`id.${id}`, true);
    }

    public Destroy() {
        this.root.Destroy();
        this.id.Destroy();
    }
}