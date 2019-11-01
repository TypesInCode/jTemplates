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

    protected get ChildNodes() { 
        return this.childNodes;
    }

    protected set Parent(val: NodeRef) {
        if(this.parent && this.parent !== val)
            this.Detach();
        
        this.parent = val;
        this.parent && this.parent.ChildNodes.add(this);
    }

    protected get Injector() {
        return this.injector;
    }

    constructor(node: any) {
        this.node = node;
        this.childNodes = new Set();
        this.injector = new Injector();
    }

    public AddChild(nodeRef: NodeRef) {
        nodeRef.Parent = this;
        this.childNodes.add(nodeRef);
        NodeConfig.addChild(this.Node, nodeRef.Node);
    }

    public AddChildAfter(currentChild: NodeRef, newChild: NodeRef) {
        if(currentChild && !this.childNodes.has(currentChild))
            throw "currentChild is not valid";
        
        newChild.Parent = this;
        NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
    }

    public DetachChild(nodeRef: NodeRef) {
        this.childNodes.delete(nodeRef);
        NodeConfig.removeChild(this.Node, nodeRef.Node);
    }

    public Detach() {
        if(this.parent)
            this.parent.DetachChild(this);

        NodeConfig.remove(this.Node);
    }

    public Destroy() {
        this.Detach();
        this.ClearChildren();
    }

    protected ClearChildren() {
        this.childNodes.forEach(node => node.Destroy());
        this.childNodes.clear();
    }
}