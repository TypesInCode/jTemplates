import NodeBinding from "./nodeBinding";

class EventBinding extends NodeBinding {
    private eventName: string;
    private eventCallback: (e: Event) => void;

    constructor(element: Node, eventName: string, bindingFunction: () => any) {
        super(element, bindingFunction);
        this.eventName = eventName;
    }

    public Destroy() {
        this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
    }

    protected Apply() {
        if(this.eventCallback)
            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
        
        this.eventCallback = this.Value;
        if(this.eventCallback)
            this.BoundTo.addEventListener(this.eventName, this.eventCallback);
    }
}

export default EventBinding;