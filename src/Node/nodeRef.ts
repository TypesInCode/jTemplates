import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";

export class NodeRef {
    private node: any;
    private parent: NodeRef;
    private childNodes: Set<NodeRef>;
    private injector: Injector;

    protected get Node() {
        return this.node;
    }

    /* protected set Parent(val: NodeRef) {
        if(this.parent && this.parent !== val)
            this.parent.DetachChild(this);
        
        this.parent = val;
    } */

    protected get Injector() {
        return this.injector;
    }

    constructor(node: any) {
        this.node = node;
        this.childNodes = new Set();
        this.injector = new Injector();
    }

    public AddChild(nodeRef: NodeRef) {
        // nodeRef.Parent = this;
        nodeRef.parent = this;
        this.childNodes.add(nodeRef);
        NodeConfig.addChild(this.Node, nodeRef.Node);
    }

    public AddChildAfter(currentChild: NodeRef, newChild: NodeRef) {
        if(currentChild && !this.childNodes.has(currentChild))
            throw "currentChild is not valid";
        
        // newChild.Parent = this;
        newChild.parent = this;
        this.childNodes.add(newChild);
        NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
    }

    public DetachChild(nodeRef: NodeRef) {
        if(this.childNodes.has(nodeRef)) {
            this.childNodes.delete(nodeRef);
            NodeConfig.removeChild(this.Node, nodeRef.Node);
            nodeRef.parent = null;
        }
    }

    public Detach() {
        if(this.parent)
            this.parent.DetachChild(this);
    }

    public Destroy() {
        // this.Detach();
        this.DestroyChildren();
    }

    protected DestroyChildren() {
        this.childNodes.forEach(node => node.Destroy());
        // this.childNodes.clear();
    }
}