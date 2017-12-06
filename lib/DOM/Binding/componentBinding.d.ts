import NodeBinding from "./nodeBinding";
import { ComponentDefinition, TemplateDefinitionMap } from "../elements";
declare class ComponentBinding extends NodeBinding {
    private component;
    private parentTemplates;
    constructor(element: Node, binding: any, compType: ComponentDefinition<any>, parentTemplates: TemplateDefinitionMap);
    Destroy(): void;
    protected Apply(): void;
}
export default ComponentBinding;
