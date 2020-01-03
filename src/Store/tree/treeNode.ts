import Emitter from "../../Utils/emitter";
import { Tree } from "./tree";
import { TreeNodeRefId } from "./treeNodeRefId";
import { ScopeCollector } from "../scope/scopeCollector";
import { IProxy, IProxyType } from "./proxy";

export class TreeNode {
    private tree: Tree;
    private parentNode: TreeNode;
    private children: Map<string, TreeNode>;
    private emitter: Emitter;
    private property: string;
    private resolvePath: { (path: string): any };
    private proxy: IProxy;
    private value: any;
    private proxyArray: Array<any>;

    get Proxy(): IProxy {
        ScopeCollector.Register(this.emitter);
        if(this.Self !== this)
            return this.Self.Proxy;

        if(this.proxy !== undefined)
            return this.proxy;

        var value = this.Value;
        var proxyType = IProxy.ValueType(value);
        if(proxyType === IProxyType.Value)
            this.proxy = value;
        else
            this.proxy = IProxy.Create(this, proxyType);
        
        return this.proxy;
    }

    get ProxyArray(): Array<any> {
        this.UpdateProxyArray(this.Value);
        return this.proxyArray;
    }

    get Children() {
        return this.children;
    }

    get Path(): string {
        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
    }

    get StoreValue(): any {
        return this.resolvePath(this.Path);
    }

    get Value(): any {
        if(this.value === undefined)
            this.value = this.StoreValue;

        return this.value;
    }

    get Self(): TreeNode {
        var value = this.Value;
        var id = TreeNodeRefId.GetIdFrom(value as any);
        if(id !== undefined)
            return this.tree.GetIdNode(id);

        return this;
    }

    get Emitter() {
        return this.emitter;
    }

    get Property() {
        return this.property;
    }

    set Property(val: string) {
        if(this.property === val)
            return;
        
        if(this.parentNode) {
            this.parentNode.Children.delete(this.property);
            this.parentNode.Children.set(val, this);
        }

        this.property = val;
    }

    constructor(tree: Tree, parentNode: TreeNode, property: string, resolvePath: { (path: string): any }) {
        this.tree = tree;
        this.proxy = undefined;
        this.value = undefined;
        this.parentNode = parentNode;
        this.Property = property;
        this.resolvePath = resolvePath;
        this.children = new Map();
        this.emitter = new Emitter();
        this.emitter.addListener("set", () => {
            this.value = undefined;
            this.proxy = undefined;
            this.parentNode && this.parentNode.UpdateCachedArray(this.property, this.Proxy);
        });
    }

    public UpdateCachedArray(index: string, value: IProxy) {
        if(this.proxyArray)
            this.proxyArray[parseInt(index)] = value;
    }

    public ClearCachedArray() {
        this.proxyArray = null;
    }

    public EnsureChild(prop: string) {
        if(!this.children)
            return null;
        
        var child: TreeNode = this.children.get(prop);
        if(!child) {
            child = new TreeNode(this.tree, this, prop, this.resolvePath);
            this.children.set(prop, child);
        }

        return child;
    }

    public Destroy() {        
        this.parentNode && this.parentNode.Children.delete(this.property);
        this.parentNode = null;

        var children = this.children;
        this.children = new Map();
        children.forEach(val => val.Destroy());
        this.emitter.removeAllListeners();
    }

    private UpdateProxyArray(value: any) {
        if(Array.isArray(value)) {
            var proxyArrayLength = this.proxyArray ? this.proxyArray.length : 0;
            this.proxyArray = this.proxyArray || new Array(value.length);
            if(value.length > proxyArrayLength) {
                for(var x=proxyArrayLength; x < value.length; x++) {
                    var child = this.EnsureChild(x.toString());
                    this.proxyArray[x] = child.Proxy;
                }
            }
            else if(value.length < this.proxyArray.length) {
                this.proxyArray.splice(value.length);
            }
        }
        else
            this.proxyArray = null;
    }

}