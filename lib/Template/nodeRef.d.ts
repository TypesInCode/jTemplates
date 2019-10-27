export declare class NodeRef {
    private namespace?;
    private node;
    private parent;
    private type;
    private nodeRefId;
    private childNodeRefs;
    private lastProperties;
    private lastEvents;
    private attached;
    private attachedCallbacks;
    readonly Node: any;
    readonly Id: string;
    protected Parent: NodeRef;
    constructor(type: string | Node, namespace?: string);
    AddChild(nodeRef: NodeRef): void;
    AddChildAfter(currentChild: NodeRef, newChild: NodeRef): void;
    AddChildren(nodeRefs: Array<NodeRef>): void;
    SetText(text: string): void;
    SetProperties(properties: {
        [key: string]: any;
    }): void;
    SetAttributes(attributes: {
        [name: string]: string;
    }): void;
    SetEvents(events: {
        [name: string]: any;
    }): void;
    DetachChild(nodeRef: NodeRef): void;
    Detach(): void;
    ToXml(): string;
    protected Attached(): void;
    private OnAttached;
    private SetPropertiesRecursive;
}
