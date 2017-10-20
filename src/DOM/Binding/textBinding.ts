import NodeBinding from "./nodeBinding";

class TextBinding extends NodeBinding {
    constructor(element: Node, binding: string | { (): string }) {
        super(element, binding);
    }

    protected Apply() {
        this.BoundTo.textContent = this.Value;
    }
}

/* namespace TextBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        if(element.nodeType == element.TEXT_NODE && Binding.IsExpression(element.textContent))
            return [new TextBinding(element, bindingParameters, scheduleUpdate)];

        return [];
    }
} */

export default TextBinding;