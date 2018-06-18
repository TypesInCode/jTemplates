import Template from "./template";
import { TemplateDefinitions } from "./elements";
export declare class BindingTemplate extends Template {
    private bindings;
    private destroyed;
    private bound;
    constructor(template: TemplateDefinitions);
    AttachTo(element: Node): void;
    Bind(): void;
    Destroy(): void;
}
