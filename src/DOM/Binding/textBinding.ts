import NodeBinding from "./nodeBinding";

class TextBinding extends NodeBinding {
    constructor(element: Node, binding: string | { (): string }) {
        super(element, binding);
    }

    protected Apply() {
        this.BoundTo.textContent = this.Value;
    }
}

export default TextBinding;