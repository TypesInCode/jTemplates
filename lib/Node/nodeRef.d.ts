import { Injector } from "../Utils/injector";
export declare class NodeRef {
    private node;
    private parent;
    private childNodes;
    private injector;
    readonly Node: any;
    protected readonly Injector: Injector;
    constructor(node: any);
    AddChild(nodeRef: NodeRef): void;
    AddChildAfter(currentChild: NodeRef, newChild: NodeRef): void;
    DetachChild(nodeRef: NodeRef): void;
    Init(): void;
    Detach(): void;
    Destroy(): void;
    protected DestroyChildren(): void;
}
