import { BindingElementsDefinition, TemplateDefinitionMap } from "../elements";
import { BindingTemplate } from "../bindingTemplate";
declare abstract class Component<P> {
    private bindingTemplate;
    private parentTemplates;
    readonly BindingTemplate: BindingTemplate;
    static readonly Name: string;
    readonly abstract Template: BindingElementsDefinition;
    readonly DefaultTemplates: TemplateDefinitionMap;
    protected readonly Templates: TemplateDefinitionMap;
    readonly Attached: boolean;
    constructor();
    SetParentData(data: P): void;
    SetParentTemplates(parentTemplates: TemplateDefinitionMap): void;
    AttachTo(element: Node): void;
    Detach(): void;
    Destroy(): void;
}
export default Component;
