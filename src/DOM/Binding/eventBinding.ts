import Binding from "../../binding";
import AttributeBinding from "./attributeBinding";

var eventRgx = /j-on(.+)/;

class EventBinding extends AttributeBinding {
    private eventName: string;
    private eventCallback: (e: Event) => void;

    constructor(element: Node, attributeName: string, parameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void) {
        super(element, attributeName, parameters, scheduleUpdate);
        this.eventName = eventRgx.exec(attributeName)[1];
    }

    protected Apply() {
        if(this.eventCallback)
            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
        
        this.eventCallback = this.Value;
        this.BoundTo.addEventListener(this.eventName, this.eventCallback);
    }
}

namespace EventBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}, scheduleUpdate: (callback: () => void) => void): Array<Binding<Node>> {
        var ret: Array<Binding<Node>> = [];
        if(element.nodeType == element.ELEMENT_NODE) {
            for(var x=0; x<element.attributes.length; x++) {
                var att = element.attributes[x];
                if(eventRgx.test(att.name))
                    ret.push(new EventBinding(element, att.name, bindingParameters, scheduleUpdate));
            }
        }
        return ret;
    }
}

export default EventBinding;