import Emitter from "../../emitter";
import { Tree } from "./tree";
import { TreeNodeRefId } from "./treeNodeRefId";

export class TreeNode {
    private destroyed: boolean;
    private tree: Tree;
    private parentNode: TreeNode;
    private children: Map<string, TreeNode>;
    private emitter: Emitter;
    private parentKey: string;
    private property: string;
    private resolvePath: { (path: string): any };
    private self: TreeNode;
    private nodeCache: any;

    get NodeCache() {
        return this.nodeCache;
    }

    set NodeCache(val: any) {
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

    get Path(): string {
        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
    }

    get Value(): any {
        if(this.destroyed)
            return undefined;

        var value = this.resolvePath(this.Path);
        var refNode = null;
        
        var id = TreeNodeRefId.GetIdFrom(value);
        if(id !== undefined)
            refNode = this.tree.GetIdNode(id);

        return refNode ? refNode.Value : value;
    }

    get Self(): TreeNode {
        if(this.destroyed)
            return this;

        if(this.self)
            return this.self;

        var value = this.resolvePath(this.Path);
        var id = TreeNodeRefId.GetIdFrom(value);
        if(id !== undefined) {
            this.self = this.tree.GetIdNode(id);
            return this.self;
        }

        return this;
    }

    get Emitter() {
        return this.emitter;
    }

    get Property() {
        return this.property;
    }

    set Property(val: string) {
        this.property = val;
    }

    get ParentKey() {
        return this.parentKey;
    }

    set ParentKey(val: string) {
        this.parentKey = val;
    }

    constructor(tree: Tree, parentNode: TreeNode, property: string, resolvePath: { (path: string): any }) {
        this.tree = tree;
        this.parentNode = parentNode;
        this.property = property;
        this.resolvePath = resolvePath;
        this.destroyed = false;
        this.children = new Map();
        this.emitter = new Emitter();
        this.emitter.addListener("set", () => {
            this.nodeCache = null;
            this.self = null;
        });
        this.UpdateParentKey();
    }

    public OverwriteChildren(children: [string, TreeNode][]) {
        this.children = new Map(children);
    }

    public UpdateParentKey() {
        if(this.parentKey === this.property || !this.parentNode)
            return;

        this.parentKey && this.parentNode.Children.delete(this.parentKey);
        this.parentNode.Children.set(this.property, this);;
        this.parentKey = this.property;
    }

    public EnsureChild(prop: string) {
        if(this.destroyed)
            return null;
        
        var child: TreeNode = this.Children.get(prop);
        if(!child) {
            child = new TreeNode(this.tree, this, prop, this.resolvePath); // this.storeManager);
            this.Children.set(prop, child);
        }

        return child;
    }

    public Destroy() {
        if(this.destroyed)
            return;
        
        this.parentNode && this.parentNode.Children.delete(this.property);
        this.parentNode = null;

        this.children.forEach(val => val.Destroy());
        this.destroyed = true;

        this.emitter.emit("destroy", this.emitter);
        this.emitter.removeAllListeners();
    }

}