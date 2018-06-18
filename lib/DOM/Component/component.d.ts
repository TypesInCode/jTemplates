import { TemplateDefinitions, TemplateValueFunctionMap, TemplateFunctionMap } from "../elements";
import { BindingTemplate } from "../bindingTemplate";
declare abstract class Component<P, T> {
    private bindingTemplate;
    private parentTemplates;
    readonly BindingTemplate: BindingTemplate;
    static readonly Name: string;
    abstract readonly Template: TemplateDefinitions;
    readonly DefaultTemplates: TemplateValueFunctionMap<T>;
    protected readonly Templates: TemplateFunctionMap<T>;
    readonly Attached: boolean;
    readonly AttachedTo: Node;
    constructor();
    SetParentData(data: P): void;
    SetParentTemplates(parentTemplates: TemplateValueFunctionMap<T>): void;
    AttachTo(element: Node): void;
    Detach(): void;
    Destroy(): void;
}
export default Component;
