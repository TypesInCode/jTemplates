import NodeBinding from "./nodeBinding";
import browser from "../browser";
import Template from "../template";
import Component from "../Component/component";


class ComponentBinding extends NodeBinding {
    private component: Component;

    public get BindsChildren(): boolean {
        return true;
    }

    constructor(element: Node, parameters: {[name: string]: any}) {
        var documentFragment = browser.createDocumentFragment(element);
        var childFragments: { [name: string]: DocumentFragment } = {};
        for(var x=0; x<documentFragment.childNodes.length; x++) {
            var node = documentFragment.childNodes[x];
            childFragments[node.nodeName] = browser.createDocumentFragment(node);
        }

        var expression = (element as any).getAttribute("j-parent");
        //super(element, expression, parameters);
        super(element, ():any => null);
        var compType = Component.Get(this.BoundTo.nodeName);
        this.component = new compType();
        this.component.SetChildElements(childFragments);
    }

    protected Apply() {
        this.component.SetParentData(this.Value);

        if(!this.component.Attached)
            this.component.AttachTo(this.BoundTo);
    }
}

/* namespace ComponentBinding {
    var componentRgx = /[^-]+-[^-]+/;

    export function Create(element: any, bindingParameters: {[name: string]: any}): Array<NodeBinding> {
        if(element.nodeType == element.ELEMENT_NODE && componentRgx.test(element.nodeName) && Component.Exists(element.nodeName))
            return [new ComponentBinding(element, bindingParameters)];

        return [];
    }
} */

export default ComponentBinding;