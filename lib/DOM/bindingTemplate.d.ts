import Template from "./template";
import { BindingElementsDefinition } from "./elements";
export declare class BindingTemplate extends Template {
    private bindings;
    private destroyed;
    private bound;
    constructor(template: BindingElementsDefinition);
    AttachTo(element: Node): void;
    Bind(): void;
    Destroy(): void;
}
