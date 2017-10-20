import NodeBinding from "./nodeBinding";

class AttributeBinding extends NodeBinding {
    private attributeName: string;

    constructor(element: Node, attributeName: string, parameters: {[name: string]: any}) {
        //super(element, (element as any).getAttribute(attributeName), parameters);
        super(element, (): any => null);
        this.attributeName = attributeName;
    }

    protected Apply() {
        (this.BoundTo as any).setAttribute(this.attributeName, this.Value);
    }
}

export default AttributeBinding;