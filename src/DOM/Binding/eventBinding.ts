import NodeBinding from "./nodeBinding";

class EventBinding extends NodeBinding {
    private eventName: string;
    private eventCallback: (e: Event) => void;

    constructor(element: Node, eventName: string, bindingFunction: () => any) {
        super(element, bindingFunction);
        this.eventName = eventName;
    }

    protected Apply() {
        if(this.eventCallback)
            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
        
        this.eventCallback = this.Value;
        this.BoundTo.addEventListener(this.eventName, this.eventCallback);
    }
}

/* namespace EventBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}): Array<NodeBinding> {
        var ret: Array<NodeBinding> = [];
        if(element.nodeType == element.ELEMENT_NODE) {
            for(var x=0; x<element.attributes.length; x++) {
                var att = element.attributes[x];
                if(eventRgx.test(att.name))
                    ret.push(new EventBinding(element, att.name, bindingParameters));
            }
        }
        return ret;
    }
} */

export default EventBinding;