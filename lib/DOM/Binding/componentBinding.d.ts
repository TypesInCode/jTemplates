import NodeBinding from "./nodeBinding";
import Component from "../Component/component";
import { TemplateDefinitionMap } from "../elements";
declare class ComponentBinding extends NodeBinding {
    private componentType;
    private component;
    private parentTemplates;
    constructor(element: Node, binding: any, compType: {
        new (): Component<any>;
    }, parentTemplates: TemplateDefinitionMap);
    Destroy(): void;
    protected Apply(): void;
}
export default ComponentBinding;
