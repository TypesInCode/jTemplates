import Binding from "../../binding";
import browser from "../browser";
import Template from "../template";
import Component from "../Component/component";


class ComponentBinding extends Binding<Node> {
    private component: Component;

    public get BindsChildren(): boolean {
        return true;
    }

    constructor(element: Node, parameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void) {
        var documentFragment = browser.createDocumentFragment(element);
        var childFragments: { [name: string]: DocumentFragment } = {};
        for(var x=0; x<documentFragment.childNodes.length; x++) {
            var node = documentFragment.childNodes[x];
            childFragments[node.nodeName] = browser.createDocumentFragment(node);
        }

        var expression = (element as any).getAttribute("j-parent");
        super(element, expression, parameters, scheduleUpdate);
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

namespace ComponentBinding {
    var componentRgx = /[^-]+-[^-]+/;

    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        if(element.nodeType == element.ELEMENT_NODE && componentRgx.test(element.nodeName) && Component.Exists(element.nodeName))
            return [new ComponentBinding(element, bindingParameters, scheduleUpdate)];

        return [];
    }
}

export default ComponentBinding;