import Template from "../template";
import Binding from "../../binding";
import browser from "../browser";
import Observable from "../../Observable/observable";
import AttributeBinding from "./attributeBinding";
import ComponentSimple from "../Component/componentSimple";

var arrayRgx = /j-array/;

class ArrayBinding extends AttributeBinding {
    private template: Template;
    private childComponents: Array<ComponentSimple>;
    private pushCallback: (obs: Observable, newVal: Observable) => void;

    public get BindsChildren(): boolean {
        return true;
    }

    constructor(element: Node, parameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void) {
        super(element, "j-array", parameters, scheduleUpdate);
        this.template = Template.Create(this.BoundTo);
        this.childComponents = [];
    }

    protected Apply() {
        var currentLength = this.childComponents.length;
        var newValue = this.Value as Array<any> || [];
        if(currentLength > newValue.length) {
            var oldComponents = this.childComponents.splice(newValue.length);
            oldComponents.forEach(c => {
                c.Destroy();
            });
        }
        else {
            var frag = browser.createDocumentFragment();
            for(var x=currentLength; x<newValue.length; x++) {
                var newComponent = new ComponentSimple(this.template, newValue[x], this.Parameters);
                newComponent.AttachTo(frag);
                this.childComponents.push(newComponent);
            }
            this.BoundTo.appendChild(frag);
        }
    }
}

namespace ArrayBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        var ret: Array<Binding<Node>> = [];
        if(element.nodeType == element.ELEMENT_NODE) {
            for(var x=0; x<element.attributes.length; x++) {
                var att = element.attributes[x];
                if(arrayRgx.test(att.name))
                    ret.push(new ArrayBinding(element, bindingParameters, scheduleUpdate));
            }
        }
        return ret;
    }
}

export default ArrayBinding;