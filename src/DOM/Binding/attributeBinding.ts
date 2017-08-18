import Binding from "../../binding";

class AttributeBinding extends Binding<Node> {
    private attributeName: string;

    constructor(element: Node, attributeName: string, parameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void) {
        super(element, (element as any).getAttribute(attributeName), parameters, scheduleUpdate);
        this.attributeName = attributeName;
    }

    protected Init() {
        this.attributeName
    }

    protected Apply() {
        (this.BoundTo as any).setAttribute(this.attributeName, this.Value);
    }
}

namespace AttributeBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        var ret: Array<Binding<Node>> = [];
        if(element.nodeType == element.ELEMENT_NODE) {
            for(var x=0; x<element.attributes.length; x++) {
                var att = element.attributes[x];
                if(Binding.IsExpression(att.value))
                    ret.push(new AttributeBinding(element, att.name, bindingParameters, scheduleUpdate));
            }
        }
        return ret;
    }
}

export default AttributeBinding;