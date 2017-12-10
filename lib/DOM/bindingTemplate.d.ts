import Template from "./template";
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
}
