import { NodeConfig } from "./nodeConfig";
import { Injector } from "../Utils/injector";

export class NodeRef {
    private node: any;
    private parent: NodeRef;
    private childNodes: Set<NodeRef>;
    private injector: Injector;
    private destroyed: boolean;

    public get Destroyed() {
        return this.destroyed;
    }

    public get Node() {
        return this.node;
    }

    protected get Injector() {
        return this.injector;
    }

    constructor(node: any) {
        this.node = node;
        this.destroyed = false;
        this.childNodes = new Set();
        this.injector = new Injector();
    }

    public AddChild(nodeRef: NodeRef) {
        nodeRef.parent = this;
        this.childNodes.add(nodeRef);
        NodeConfig.addChild(this.Node, nodeRef.Node);
    }

    public AddChildAfter(currentChild: NodeRef, newChild: NodeRef) {
        if(currentChild && !this.childNodes.has(currentChild))
            throw "currentChild is not valid";
        
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

    public Init() {

    }

    public Detach() {
        if(this.parent)
            this.parent.DetachChild(this);
    }

    public Destroy() {
        this.destroyed = true;
        this.DestroyChildren();
    }

    protected DestroyChildren() {
        this.childNodes.forEach(node => node.Destroy());
    }
}