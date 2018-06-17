declare class Template {
    private documentFragment;
    private attachedTo;
    private elements;
    readonly DocumentFragment: DocumentFragment;
    readonly Attached: boolean;
    readonly AttachedTo: Node;
    constructor(documentFragment: DocumentFragment);
    AttachTo(element: Node): void;
    Detach(): void;
    Clone(): Template;
}
declare namespace Template {
    function Create(template: Node | string | Template): Template;
}
export default Template;
