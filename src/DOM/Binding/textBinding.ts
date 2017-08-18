import Binding from "../../binding";

class TextBinding extends Binding<Node> {
    constructor(element: Node, parameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void) {
        super(element, element.textContent, parameters, scheduleUpdate);
    }

    protected Apply() {
        this.BoundTo.textContent = this.Value;
    }
}

namespace TextBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        if(element.nodeType == element.TEXT_NODE && Binding.IsExpression(element.textContent))
            return [new TextBinding(element, bindingParameters, scheduleUpdate)];

        return [];
    }
}

export default TextBinding;