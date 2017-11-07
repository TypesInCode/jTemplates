import NodeBinding from "./nodeBinding";
declare class EventBinding extends NodeBinding {
    private eventName;
    private eventCallback;
    constructor(element: Node, eventName: string, bindingFunction: () => any);
    Destroy(): void;
    protected Apply(): void;
}
export default EventBinding;
