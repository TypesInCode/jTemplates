import Template from "./template";
import NodeBinding from "./Binding/nodeBinding";
import { BindingElementsDefinition } from "./elements";
export declare class BindingTemplate extends Template {
    private bindings;
    private destroyed;
    private bound;
    private updatingBindings;
    private updatingCallback;
    private updatedCallback;
    constructor(template: BindingElementsDefinition);
    AttachTo(element: Node): void;
    Bind(): void;
    Destroy(): void;
    protected Updating(binding: NodeBinding): void;
    protected Updated(binding: NodeBinding): void;
}
